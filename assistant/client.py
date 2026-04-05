import time
import ollama


def chat(model: str, prompt: str, temperature: float = 0.7) -> str:
    """Simple one-shot generation, returns response text."""
    response = ollama.generate(
        model=model,
        prompt=prompt,
        options={"temperature": temperature},
    )
    return response["response"]


def benchmark_generate(model: str, prompt: str, temperature: float = 0.7) -> dict:
    """
    Run a single generation and collect timing metrics.

    Returns a dict with:
        model, prompt_preview, tokens_per_second,
        time_to_first_token_ms, total_latency_ms, response
    """
    start = time.perf_counter()
    first_token_time = None
    full_response = ""
    eval_count = 0
    eval_duration_ns = 0

    for chunk in ollama.generate(
        model=model,
        prompt=prompt,
        options={"temperature": temperature},
        stream=True,
    ):
        token = chunk.get("response", "")
        if token and first_token_time is None:
            first_token_time = time.perf_counter()
        full_response += token

        if chunk.get("done"):
            eval_count = chunk.get("eval_count", 0)
            eval_duration_ns = chunk.get("eval_duration", 0)

    end = time.perf_counter()

    total_latency_ms = round((end - start) * 1000, 1)
    ttft_ms = round((first_token_time - start) * 1000, 1) if first_token_time else None
    tps = round(eval_count / (eval_duration_ns / 1e9), 2) if eval_duration_ns else 0.0

    return {
        "model": model,
        "prompt_preview": prompt[:60],
        "tokens_per_second": tps,
        "time_to_first_token_ms": ttft_ms,
        "total_latency_ms": total_latency_ms,
        "response": full_response,
    }
