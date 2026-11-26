// Vercel Serverless Function : /api/verifier-joueur
// Ta clé KoraTopUp reste ICI, côté serveur : Vercel > Settings > Environment Variables > KORA_API_KEY
const KORA = 'https://koratopup.com/api/v1';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const key = process.env.KORA_API_KEY;
  if (!key) return res.status(500).json({ checked: false });

  const { game, player_id } = req.body || {};
  if (game !== 'Free Fire' || !/^[0-9]{9,15}$/.test(String(player_id || ''))) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  const headers = { 'X-API-Key': key, 'Content-Type': 'application/json' };
  try {
    // Les vrais product_id sont ceux de GET /products (pas inventés)
    const pr = await fetch(KORA + '/products', { headers, signal: AbortSignal.timeout(20000) });
    const produit = ((await pr.json()).products || []).find((p) => p.game === 'Free Fire');
    if (!produit) return res.status(200).json({ checked: false });

    const r = await fetch(KORA + '/check-player', {
      method: 'POST', headers, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ product_id: produit.id, player_id }),
    });
    const d = await r.json();
    if (r.status === 422 || (d.error && d.error.code === 'invalid_player')) return res.status(200).json({ checked: true, valid: false });
    if (d.error) return res.status(200).json({ checked: false });
    return res.status(200).json({ checked: d.checked, valid: d.valid, player_name: d.player_name || null });
  } catch (e) {
    return res.status(200).json({ checked: false });
  }
};
