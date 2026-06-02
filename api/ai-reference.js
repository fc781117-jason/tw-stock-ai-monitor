export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const body = req.body || {};
  const prompt = buildPrompt(body);

  try {
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: '你是台股交易決策輔助系統，只能輸出參考分析，不可承諾獲利，不可直接叫使用者下單。請使用繁體中文，遵守「大盤→主流→個股→買點→商品→停損停利」流程。所有結論都要附風險條件。'
              }
            ]
          },
          { role: 'user', content: [{ type: 'input_text', text: prompt }] }
        ],
        temperature: 0.25,
        max_output_tokens: 1200
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ error: data?.error?.message || 'OpenAI API error' });
    }
    const text = data.output_text || extractText(data) || 'AI 參考分析產生完成，但未取得文字內容。';
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}

function extractText(data) {
  try {
    return data.output?.flatMap(item => item.content || []).map(c => c.text || '').join('\n').trim();
  } catch (_) {
    return '';
  }
}

function buildPrompt(payload) {
  return `
請根據以下資料產出「AI 參考分析，人工確認後發布」格式的交易輔助分析。

必須遵守：
1. 第一優先底層邏輯：風大 × 浪跡核心系統。
2. 分析順序：大盤 → 主流 → 個股 → 買點 → 商品工具 → 停損停利。
3. 商品包含：零股、現股、融資、股票期貨、權證、選擇權。
4. 權證規則：先確認現股可買；價格 0.7~3 元；天期 60 天以上；有效槓桿 4~8 倍；-20% 停損；2~3 天不發動撤離。
5. 不可以說「保證獲利」、「一定會漲」、「建議重押」。

使用者角色：${payload.role}
個人設定：${JSON.stringify(payload.tradeProfile)}
目前標的：${JSON.stringify(payload.selectedSymbol)}
主流族群：${JSON.stringify(payload.sectors)}
候選清單：${JSON.stringify(payload.symbols)}
底層規則：${JSON.stringify(payload.rules)}

請輸出：
- 市場與主流判斷
- 標的買點判斷
- 商品工具建議
- 權證 / 股期 / 選擇權風險
- 停損停利條件
- 管理員確認前需覆核的項目
`;
}
