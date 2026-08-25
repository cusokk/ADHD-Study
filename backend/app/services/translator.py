import asyncio

from deep_translator import GoogleTranslator


async def translate_phrase(phrase: str, source: str, target: str) -> str:
    translator = GoogleTranslator(source=source, target=target)
    return await asyncio.to_thread(translator.translate, phrase)
