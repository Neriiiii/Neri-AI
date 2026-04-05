import json
import csv
import statistics
from pathlib import Path
from datetime import datetime

from rich.console import Console
from rich.table import Table

from assistant.client import benchmark_generate

console = Console()
RESULTS_DIR = Path("results")


def run_benchmark(
    model: str,
    prompts: list[str],
    trials: int = 3,
    temperature: float = 0.7,
) -> list[dict]:
    """
    Run each prompt `trials` times and return averaged metric rows.
    """
    RESULTS_DIR.mkdir(exist_ok=True)
    rows = []

    for i, prompt in enumerate(prompts, 1):
        console.print(f"[cyan]Prompt {i}/{len(prompts)}:[/] {prompt[:60]}...")
        trial_results = []

        for t in range(trials):
            console.print(f"  Trial {t + 1}/{trials}", end="\r")
            result = benchmark_generate(model, prompt, temperature)
            trial_results.append(result)

        avg = {
            "model": model,
            "prompt_preview": prompt[:60],
            "tokens_per_second": round(
                statistics.mean(r["tokens_per_second"] for r in trial_results), 2
            ),
            "time_to_first_token_ms": round(
                statistics.mean(
                    r["time_to_first_token_ms"]
                    for r in trial_results
                    if r["time_to_first_token_ms"] is not None
                ),
                1,
            ),
            "total_latency_ms": round(
                statistics.mean(r["total_latency_ms"] for r in trial_results), 1
            ),
            "trials": trials,
            "temperature": temperature,
        }
        rows.append(avg)
        console.print(
            f"  [green]avg[/] TPS={avg['tokens_per_second']} "
            f"TTFT={avg['time_to_first_token_ms']}ms "
            f"latency={avg['total_latency_ms']}ms"
        )

    return rows


def save_results(rows: list[dict], label: str = "") -> None:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    stem = f"{label}_{timestamp}" if label else timestamp

    json_path = RESULTS_DIR / f"{stem}.json"
    csv_path = RESULTS_DIR / f"{stem}.csv"

    json_path.write_text(json.dumps(rows, indent=2))

    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    console.print(f"\n[bold green]Results saved:[/] {json_path}  |  {csv_path}")


def print_summary_table(rows: list[dict]) -> None:
    table = Table(title="Benchmark Results", show_lines=True)
    table.add_column("Model", style="cyan")
    table.add_column("Prompt", style="dim", max_width=40)
    table.add_column("TPS", justify="right", style="green")
    table.add_column("TTFT (ms)", justify="right")
    table.add_column("Latency (ms)", justify="right")

    for r in rows:
        table.add_row(
            r["model"],
            r["prompt_preview"],
            str(r["tokens_per_second"]),
            str(r["time_to_first_token_ms"]),
            str(r["total_latency_ms"]),
        )

    console.print(table)
