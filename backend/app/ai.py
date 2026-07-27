from __future__ import annotations

import json
import os

from litellm import acompletion

from .schemas import ChatExtraction, ChatMessage


MODEL = os.getenv("OPENROUTER_MODEL", "openrouter/openai/gpt-oss-120b")
PROVIDER = os.getenv("OPENROUTER_PROVIDER", "cerebras")
API_BASE = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("OPENROUTER_TIMEOUT_SECONDS", "30"))

SYSTEM_PROMPT = """You guide a user through the supported fictional Singapore
insurance planning summaries. The only document types this prototype can
generate are: (1) public/government hospital plan comparison, (2) critical
illness plan comparison, or (3) a combined comparison containing both.

Classify the request_intent as hospitalisation, critical_illness, combined,
unsupported, or undetermined. Requests for life insurance/life plans, wealth
planning, investments, retirement planning, or personal financial advice are
unsupported. Set unsupported_topic to life_plan, financial_advice, or other.
For a supported request, unsupported_topic must be null.

When a request is unsupported, clearly and concisely explain that this
prototype cannot generate that plan or provide financial advice. Offer the
closest supported public-hospital and critical-illness planning summaries, and
ask which one the user wants. Do not imply that either is equivalent to the
unsupported request. For an undetermined request, briefly present the same
three supported choices and ask the user to choose.

For a supported request, extract only: age, annual budget in SGD, residency
status, spouse citizenship, and whether they want public/government hospital
and/or critical-illness coverage.

Ask one concise, friendly follow-up question at a time, prioritising missing
fields. Accept monthly budgets and convert them to annual amounts. Do not ask
for or repeat names, contact details, identifiers, employer details, diagnoses,
symptoms, medications, or medical history. If the user provides such data,
tell them it is not needed and do not include it in the structured criteria.
Do not suggest, rank, or recommend a plan. Do not provide financial advice.
When every field is present, invite the user to review the extracted details.
All plans and values are fictional. Return only the required JSON schema."""


def _provider_schema() -> dict:
    """Remove validation keywords Cerebras does not accept in response_format."""
    schema = ChatExtraction.model_json_schema()
    unsupported = {"default", "maximum", "minimum", "maxLength", "minLength"}

    def clean(value):
        if isinstance(value, dict):
            return {
                key: clean(child)
                for key, child in value.items()
                if key not in unsupported
            }
        if isinstance(value, list):
            return [clean(child) for child in value]
        return value

    return clean(schema)


async def collect_criteria(messages: list[ChatMessage]) -> ChatExtraction:
    response = await acompletion(
        model=MODEL,
        api_base=API_BASE,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            *[message.model_dump() for message in messages],
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "insurance_criteria_extraction",
                "strict": True,
                "schema": _provider_schema(),
            },
        },
        extra_body={
            "provider": {
                "only": [PROVIDER],
                "allow_fallbacks": False,
                "require_parameters": True,
                "data_collection": "deny",
                "zdr": True,
            }
        },
        temperature=0,
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    content = response.choices[0].message.content
    if not isinstance(content, str):
        raise ValueError("The model returned an empty structured response.")
    return ChatExtraction.model_validate(json.loads(content))
