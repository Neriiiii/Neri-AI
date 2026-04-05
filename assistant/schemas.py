import json
import ollama
from pydantic import BaseModel, ValidationError


class AIResponse(BaseModel):
    title: str
    summary: str
    tags: list[str]


def _build_example(schema: type[BaseModel]) -> str:
    """Build a plain-English field list + concrete JSON example from a Pydantic model."""
    fields = []
    example = {}
    for name, field in schema.model_fields.items():
        annotation = field.annotation
        type_name = getattr(annotation, "__name__", str(annotation))
        fields.append(f'  "{name}": ({type_name})')
        # provide a realistic placeholder value per type
        if annotation is str:
            example[name] = f"your {name} here"
        elif annotation == list[str]:
            example[name] = ["tag1", "tag2"]
        else:
            example[name] = f"<{type_name}>"
    fields_str = "\n".join(fields)
    example_str = json.dumps(example, indent=2)
    return f"Required fields:\n{fields_str}\n\nExample output:\n{example_str}"


def structured_generate(
    model: str,
    prompt: str,
    schema: type[BaseModel] = AIResponse,
    temperature: float = 0.0,
    max_retries: int = 3,
) -> BaseModel:
    """
    Ask the model to return JSON matching `schema`.
    Retries up to `max_retries` times with a stricter prompt on failure.
    """
    schema_hint = _build_example(schema)
    base_system = (
        f"You are a helpful assistant that ONLY responds with a valid JSON object.\n"
        f"Do NOT include any explanation, markdown, or extra text — output the JSON object only.\n\n"
        f"{schema_hint}"
    )

    for attempt in range(max_retries):
        system = base_system
        if attempt > 0:
            system += "\nReturn ONLY valid JSON. No markdown, no backticks, no extra text."

        response = ollama.generate(
            model=model,
            prompt=prompt,
            system=system,
            options={"temperature": temperature},
        )

        raw = response["response"].strip()

        # Strip markdown code fences if the model wraps output
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            data = json.loads(raw)
            return schema(**data)
        except (json.JSONDecodeError, ValidationError) as exc:
            if attempt == max_retries - 1:
                raise RuntimeError(
                    f"Failed to parse structured output after {max_retries} attempts.\n"
                    f"Last error: {exc}\nLast raw response:\n{raw}"
                ) from exc
