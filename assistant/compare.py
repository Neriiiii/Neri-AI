import statistics
from rich.console import Console
from rich.table import Table

from assistant.benchmark import run_benchmark, save_results

console = Console()


def run_comparison(
    models: list[str],
    prompts: list[str],
    trials: int = 3,
    temperature: float = 0.0,
) -> dict[str, list[dict]]:
    """
    Run the same benchmark across all models and return results grouped by model.
    """
    all_results: dict[str, list[dict]] = {}

    for model in models:
        console.rule(f"[bold cyan]{model}")
        rows = run_benchmark(model, prompts, trials=trials, temperature=temperature)
        all_results[model] = rows
        save_results(rows, label=model.replace(":", "_"))

    return all_results


def print_comparison_table(all_results: dict[str, list[dict]]) -> None:
    table = Table(title="Model Comparison Summary", show_lines=True)
    table.add_column("Model", style="cyan")
    table.add_column("Avg TPS", justify="right", style="green")
    table.add_column("Avg TTFT (ms)", justify="right")
    table.add_column("Avg Latency (ms)", justify="right")

    for model, rows in all_results.items():
        avg_tps = round(statistics.mean(r["tokens_per_second"] for r in rows), 2)
        avg_ttft = round(
            statistics.mean(
                r["time_to_first_token_ms"]
                for r in rows
                if r["time_to_first_token_ms"] is not None
            ),
            1,
        )
        avg_latency = round(statistics.mean(r["total_latency_ms"] for r in rows), 1)
        table.add_row(model, str(avg_tps), str(avg_ttft), str(avg_latency))

    console.print(table)
