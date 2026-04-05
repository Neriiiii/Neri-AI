"""
Neri AI — CLI entry point

Commands:
  chat        Interactive chat with a local model
  benchmark   Benchmark a single model on the prompt set
  compare     Compare multiple models head-to-head
  structured  Demo structured JSON output with Pydantic validation
"""

import argparse
import json
import sys
from pathlib import Path

from rich.console import Console
from rich.prompt import Prompt

console = Console()


# ---------------------------------------------------------------------------
# chat
# ---------------------------------------------------------------------------

def cmd_chat(args):
    from assistant.client import chat

    console.print(
        f"[bold green]Chat started[/] with [cyan]{args.model}[/]  "
        f"(temperature={args.temperature})  |  type [bold]quit[/] to exit\n"
    )

    while True:
        user_input = Prompt.ask("[bold blue]You")
        if user_input.strip().lower() in {"quit", "exit", "q"}:
            break
        response = chat(args.model, user_input, temperature=args.temperature)
        console.print(f"\n[bold green]{args.model}:[/] {response}\n")


# ---------------------------------------------------------------------------
# benchmark
# ---------------------------------------------------------------------------

def cmd_benchmark(args):
    from assistant.benchmark import run_benchmark, save_results, print_summary_table

    prompt_file = Path(args.prompts)
    if not prompt_file.exists():
        console.print(f"[red]Prompt file not found:[/] {prompt_file}")
        sys.exit(1)

    raw = json.loads(prompt_file.read_text())
    prompts = [p["prompt"] for p in raw]

    if args.limit:
        prompts = prompts[: args.limit]

    console.rule(f"[bold cyan]Benchmarking {args.model}")
    rows = run_benchmark(
        model=args.model,
        prompts=prompts,
        trials=args.trials,
        temperature=args.temperature,
    )
    print_summary_table(rows)
    save_results(rows, label=args.model.replace(":", "_"))


# ---------------------------------------------------------------------------
# compare
# ---------------------------------------------------------------------------

def cmd_compare(args):
    from assistant.compare import run_comparison, print_comparison_table

    models = [m.strip() for m in args.models.split(",")]
    prompt_file = Path(args.prompts)
    if not prompt_file.exists():
        console.print(f"[red]Prompt file not found:[/] {prompt_file}")
        sys.exit(1)

    raw = json.loads(prompt_file.read_text())
    prompts = [p["prompt"] for p in raw]

    if args.limit:
        prompts = prompts[: args.limit]

    all_results = run_comparison(
        models=models,
        prompts=prompts,
        trials=args.trials,
        temperature=args.temperature,
    )
    print_comparison_table(all_results)


# ---------------------------------------------------------------------------
# structured
# ---------------------------------------------------------------------------

def cmd_structured(args):
    from assistant.schemas import AIResponse, structured_generate

    console.rule(f"[bold cyan]Structured Output Demo — {args.model}")
    console.print(f"Prompt: [italic]{args.prompt}[/]\n")

    result = structured_generate(
        model=args.model,
        prompt=args.prompt,
        schema=AIResponse,
        temperature=args.temperature,
        max_retries=args.retries,
    )

    console.print("[bold green]Parsed output:[/]")
    console.print(f"  [cyan]title:[/]   {result.title}")
    console.print(f"  [cyan]summary:[/] {result.summary}")
    console.print(f"  [cyan]tags:[/]    {', '.join(result.tags)}")


# ---------------------------------------------------------------------------
# CLI setup
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="assistant",
        description="Neri AI — runs entirely on Ollama, zero API cost",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # --- chat ---
    p_chat = sub.add_parser("chat", help="Interactive chat")
    p_chat.add_argument("--model", default="llama3.2", help="Ollama model name")
    p_chat.add_argument("--temperature", type=float, default=0.7)
    p_chat.set_defaults(func=cmd_chat)

    # --- benchmark ---
    p_bench = sub.add_parser("benchmark", help="Benchmark a single model")
    p_bench.add_argument("--model", default="llama3.2")
    p_bench.add_argument("--prompts", default="prompts/prompt_set.json")
    p_bench.add_argument("--trials", type=int, default=3)
    p_bench.add_argument("--temperature", type=float, default=0.7)
    p_bench.add_argument("--limit", type=int, default=None, help="Max prompts to run")
    p_bench.set_defaults(func=cmd_benchmark)

    # --- compare ---
    p_cmp = sub.add_parser("compare", help="Compare multiple models")
    p_cmp.add_argument(
        "--models",
        default="llama3.2,mistral:7b,phi4",
        help="Comma-separated list of model names",
    )
    p_cmp.add_argument("--prompts", default="prompts/prompt_set.json")
    p_cmp.add_argument("--trials", type=int, default=3)
    p_cmp.add_argument("--temperature", type=float, default=0.0)
    p_cmp.add_argument("--limit", type=int, default=None)
    p_cmp.set_defaults(func=cmd_compare)

    # --- structured ---
    p_struct = sub.add_parser("structured", help="Demo structured JSON output")
    p_struct.add_argument("--model", default="llama3.2")
    p_struct.add_argument(
        "--prompt",
        default="Explain what recursion is in programming.",
    )
    p_struct.add_argument("--temperature", type=float, default=0.0)
    p_struct.add_argument("--retries", type=int, default=3)
    p_struct.set_defaults(func=cmd_structured)

    return parser


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
