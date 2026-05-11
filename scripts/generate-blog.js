const https = require('https');
const fs = require('fs');
const path = require('path');

const BLOG_FILE = path.join(__dirname, '..', 'blog-posts.json');
const MAX_POSTS = 20;

const TOPICS = [
  { slug: 'bitcoin-inflacion-latam',       cat: 'Análisis',   emoji: '₿',  bg: '#f7931a22', tags: ['Bitcoin', 'Inflación', 'LATAM'],               keywords: 'Bitcoin como protección contra la inflación en América Latina' },
  { slug: 'altcoins-prometedoras',          cat: 'Mercado',    emoji: '🚀', bg: '#7c5cfc22', tags: ['Altcoins', 'Inversión', 'Análisis'],             keywords: 'mejores altcoins para invertir en 2026' },
  { slug: 'wallets-frias-calientes',        cat: 'Seguridad',  emoji: '🔐', bg: '#ff4d6a22', tags: ['Wallets', 'Seguridad', 'Ledger'],                keywords: 'wallets frías vs calientes para guardar criptomonedas' },
  { slug: 'solana-vs-ethereum',             cat: 'Análisis',   emoji: '⚔️', bg: '#9b59b622', tags: ['Solana', 'Ethereum', 'Comparativa'],             keywords: 'Solana vs Ethereum diferencias velocidad comisiones' },
  { slug: 'remesas-cripto-latam',           cat: 'Casos de uso', emoji: '💸', bg: '#00d08422', tags: ['Remesas', 'LATAM', 'Transferencias'],          keywords: 'enviar remesas con criptomonedas más barato a LATAM' },
  { slug: 'como-evitar-estafas-cripto',     cat: 'Seguridad',  emoji: '🛡️', bg: '#ff4d6a22', tags: ['Estafas', 'Seguridad', 'Phishing'],              keywords: 'estafas de criptomonedas más comunes y cómo evitarlas' },
  { slug: 'bitcoin-etf-que-significa',      cat: 'Mercado',    emoji: '📈', bg: '#f7931a22', tags: ['ETF', 'Bitcoin', 'Inversión institucional'],     keywords: 'ETF de Bitcoin qué significa para inversores latinoamericanos' },
  { slug: 'stablecoins-guia-completa',      cat: 'Guía básica', emoji: '💵', bg: '#00a86b22', tags: ['Stablecoins', 'USDT', 'USDC'],                 keywords: 'stablecoins qué son cuáles son más seguras USDT USDC DAI' },
  { slug: 'mineria-bitcoin-2026',           cat: 'Minería',    emoji: '⛏️', bg: '#ffb83022', tags: ['Minería', 'Bitcoin', 'Energía'],                 keywords: 'minería de Bitcoin en 2026 sigue siendo rentable' },
  { slug: 'cripto-portafolio-principiantes', cat: 'Estrategia', emoji: '📊', bg: '#4a90d922', tags: ['Portafolio', 'Diversificación', 'Principiantes'], keywords: 'cómo armar portafolio de criptomonedas para principiantes' },
  { slug: 'analisis-tecnico-cripto',        cat: 'Trading',    emoji: '📉', bg: '#9b59b622', tags: ['Análisis técnico', 'Trading', 'Gráficos'],       keywords: 'análisis técnico básico para trading de criptomonedas' },
  { slug: 'web3-latam-oportunidades',       cat: 'Web3',       emoji: '🌐', bg: '#7c5cfc22', tags: ['Web3', 'LATAM', 'Blockchain'],                   keywords: 'oportunidades de Web3 y blockchain en América Latina' },
  { slug: 'p2p-exchanges-seguridad',        cat: 'Seguridad',  emoji: '🤝', bg: '#00d08422', tags: ['P2P', 'Seguridad', 'Binance P2P'],               keywords: 'cómo usar exchanges P2P de forma segura en LATAM' },
  { slug: 'cripto-colombia-guia',           cat: 'Guía básica', emoji: '🇨🇴', bg: '#ffb83022', tags: ['Colombia', 'Principiantes', 'DIAN'],           keywords: 'cómo comprar criptomonedas en Colombia guía completa 2026' },
  { slug: 'cripto-argentina-inflacion',     cat: 'Casos de uso', emoji: '🇦🇷', bg: '#4a90d922', tags: ['Argentina', 'Inflación', 'Dólar cripto'],    keywords: 'criptomonedas en Argentina contra la inflación y el cepo' },
  { slug: 'nft-siguen-vigentes',            cat: 'Web3',       emoji: '🎨', bg: '#9b59b622', tags: ['NFT', 'Arte digital', 'Web3'],                   keywords: 'NFTs en 2026 siguen siendo relevantes o murieron' },
];

function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }]
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          resolve(parsed.content[0].text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function todayStr() {
  const d = new Date();
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(BLOG_FILE, 'utf8'));

  // Pick topic: rotate by day of year, skip already-used slugs
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const existingSlugs = new Set(existing.map(p => p.id));
  let topic = null;
  for (let i = 0; i < TOPICS.length; i++) {
    const candidate = TOPICS[(dayOfYear + i) % TOPICS.length];
    if (!existingSlugs.has(candidate.slug)) { topic = candidate; break; }
  }
  // If all topics used, force the day's topic anyway (will update existing)
  if (!topic) topic = TOPICS[dayOfYear % TOPICS.length];

  console.log(`Generating post for topic: ${topic.keywords}`);

  const prompt = `Eres un experto en criptomonedas escribiendo para lectores de América Latina (Chile, México, Colombia, Argentina). Escribe un artículo de blog en español sobre: "${topic.keywords}".

El artículo debe:
- Estar en español latinoamericano, tono amigable y práctico
- Tener entre 400-600 palabras de contenido real y útil
- Incluir ejemplos concretos para LATAM (exchanges locales, monedas locales, regulaciones)
- Usar HTML simple: <p>, <h2>, <ul>, <li>, <strong>, y estos dos componentes especiales:
  <div class="highlight">💡 texto del tip</div>
  <div class="warning">⚠️ texto del aviso</div>

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin bloques de código) con esta estructura exacta:
{
  "id": "${topic.slug}",
  "cat": "${topic.cat}",
  "featured": false,
  "title": "título del artículo en español",
  "excerpt": "descripción corta de 1-2 oraciones",
  "emoji": "${topic.emoji}",
  "bg": "${topic.bg}",
  "time": "X min",
  "date": "${todayStr()}",
  "author": "Equipo Criptum21",
  "tags": ${JSON.stringify(topic.tags)},
  "content": "contenido HTML completo aquí"
}`;

  const raw = await callClaude(prompt);

  // Extract JSON — Claude sometimes adds surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response:\n' + raw);

  const post = JSON.parse(jsonMatch[0]);

  // Validate required fields
  const required = ['id','title','excerpt','content','date'];
  for (const f of required) {
    if (!post[f]) throw new Error(`Missing field: ${f}`);
  }

  // Prepend new post, remove duplicates by id, cap at MAX_POSTS
  const updated = [post, ...existing.filter(p => p.id !== post.id)].slice(0, MAX_POSTS);
  fs.writeFileSync(BLOG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`Done. Blog now has ${updated.length} posts. Latest: "${post.title}"`);
}

main().catch(err => { console.error(err); process.exit(1); });
