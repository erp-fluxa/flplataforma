const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  try {
    const url = req.url || '/';

    // 1. Localizar o arquivo HTML base (index.html ou fluxa-mobile.html)
    let templateFile = 'index.html';
    if (url.startsWith('/mobile') || url.includes('mobile')) {
      templateFile = 'fluxa-mobile.html';
    }

    let filePath = path.join(process.cwd(), templateFile);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'dist', templateFile);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'index.html');
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // 2. Buscar configurações de branding dinâmicas no Supabase
    let branding = {
      nome_sistema: 'Fluxa ERP',
      slogan: 'Gestão Integrada Industrial',
      logo_login_url: null,
      logo_icone_url: null,
      logo_texto_url: null,
      logo_institucional_url: null,
      updated_at: new Date().toISOString()
    };

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/system_branding?select=*&limit=1`;
        const sbRes = await fetch(endpoint, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (sbRes.ok) {
          const data = await sbRes.json();
          if (Array.isArray(data) && data.length > 0 && data[0]) {
            branding = Object.assign(branding, data[0]);
          }
        }
      } catch (e) {
        console.warn('[Serverless Branding Fetch Error]', e);
      }
    }

    // 3. Substituir marcadores de template no HTML
    const systemTitle = branding.nome_sistema || 'Fluxa ERP Industrial';
    const systemSlogan = branding.slogan || 'Gestão Integrada de Compras, PCP & Produção';
    const logoLogin = branding.logo_login_url || 'assets/fluxa_logo_texto.png';
    const logoIcone = branding.logo_icone_url || 'assets/fluxa_logo_icone.png';
    const logoTexto = branding.logo_texto_url || 'assets/fluxa_logo_texto.png';
    const logoInstitucional = branding.logo_institucional_url || 'assets/logo_jp3d.png';

    const brandingObj = {
      customLogos: {
        fluxa: logoLogin,
        logo_icone: logoIcone,
        logo_texto: logoTexto,
        jp3d: logoInstitucional,
        _v: branding.updated_at ? new Date(branding.updated_at).getTime() : Date.now()
      },
      company: {
        logo_plataforma_url: logoLogin,
        logo_icone_url: logoIcone,
        logo_texto_url: logoTexto,
        logo_institucional_url: logoInstitucional,
        fantasia: systemTitle
      },
      nome_sistema: systemTitle,
      slogan: systemSlogan,
      updated_at: branding.updated_at
    };
    const brandingJson = JSON.stringify(brandingObj);

    html = html
      .replace(/\{\{SYSTEM_TITLE\}\}/g, systemTitle)
      .replace(/\{\{SYSTEM_SLOGAN\}\}/g, systemSlogan)
      .replace(/\{\{LOGIN_LOGO_URL\}\}/g, logoLogin)
      .replace(/\{\{LOGO_ICONE_URL\}\}/g, logoIcone)
      .replace(/\{\{LOGO_TEXTO_URL\}\}/g, logoTexto)
      .replace(/\{\{LOGO_INSTITUCIONAL_URL\}\}/g, logoInstitucional)
      .replace(/\{\{BRANDING_JSON\}\}/g, brandingJson);

    // 4. Injetar window.INITIAL_SYSTEM_BRANDING no script se não substituído por marcador
    if (!html.includes('window.INITIAL_SYSTEM_BRANDING')) {
      const injectScript = `<script id="serverless-branding-inject">window.INITIAL_SYSTEM_BRANDING = ${brandingJson};</script>`;
      html = html.replace('</head>', `${injectScript}\n</head>`);
    }

    // 5. Retornar resposta HTTP dinâmica com headers no-store estritos
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Render-Engine', 'Vercel-Serverless-Dynamic-Branding');

    return res.status(200).send(html);
  } catch (err) {
    console.error('[Serverless Render Error]', err);
    return res.status(500).send(`Server Error: ${err.message}`);
  }
};
