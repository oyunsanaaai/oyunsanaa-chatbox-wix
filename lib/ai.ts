export async function summarize(text: string) {
  // Жишээ – зөвхөн server талаас дуудах
  const key = process.env.OPENAI_API_KEY!;
  // энд OpenAI API дуудлагын кодоо байрлуулах (fetch ...)
  return `summary:${text.slice(0, 50)}...`;
}
