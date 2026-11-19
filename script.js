/* ==========================================================================
   Vale Localiza - Script Completo e Unificado (Todas as Telas & Funcionalidades)
   Desenvolvido por: Yuri Honorato & Filipe
   ========================================================================== */

const $ = id => document.getElementById(id);

const STATUS = {
  DISPONIVEL: 'Disponível',
  EM_USO: 'Em Uso',
  EM_MANUTENCAO: 'Em Manutenção',
  PERDIDO: 'Perdido'
};

// Base de dados inicial (utilizada como fallback local caso o backend SQLite/Python não esteja rodando)
const DEFAULT_ITEMS = [
  { code: 'PAT-2201', name: 'Bomba Hidráulica #2201', cat: 'Hidráulica', sector: 'Galpão A', prateleira: 'Prateleira 4B', loc: 'Galpão A - Prateleira 4B', status: 'Disponível', employee: '', employeeName: '' },
  { code: 'PAT-0300', name: 'Filtro de Óleo X300', cat: 'Filtros', sector: 'Galpão A', prateleira: 'Prateleira 4B', loc: 'Galpão A - Prateleira 4B', status: 'Disponível', employee: '', employeeName: '' },
  { code: 'PAT-0015', name: 'Válvula Esférica #15', cat: 'Conexões', sector: 'Galpão A', prateleira: 'Prateleira 3B', loc: 'Galpão A - Prateleira 3B', status: 'Disponível', employee: '', employeeName: '' },
  { code: 'PAT-3321', name: 'Torquímetro 1/2"', cat: 'Ferramentas', sector: 'Oficina Central', prateleira: 'Armário 01', loc: 'Oficina Central > Armário 01', status: 'Em Uso', employee: '8820', employeeName: 'Carlos Eduardo' },
  { code: 'PAT-0084', name: 'Bomba Hidráulica de Teste', cat: 'Hidráulica', sector: 'Galpão B', prateleira: 'Prateleira 02', loc: 'Galpão B - Prateleira 02', status: 'Em Manutenção', employee: '', employeeName: 'Manutenção Mecânica' },
  { code: 'PAT-1049', name: 'Esmerilhadeira Angular 7"', cat: 'Ferramentas', sector: 'Oficina Central', prateleira: 'Armário 03', loc: 'Oficina Central > Armário 03', status: 'Disponível', employee: '', employeeName: '' }
];

const DEFAULT_MOVEMENTS = [
  { date: '27/10/2026 - 15:42', code: 'PAT-3321', item: 'Torquímetro 1/2"', type: 'Retirada', location: 'Oficina Central > Armário 01', employee: 'Carlos Eduardo', obs: '' },
  { date: '27/10/2026 - 14:10', code: 'PAT-0084', item: 'Bomba Hidráulica de Teste', type: 'Enviado p/ Manutenção', location: 'Galpão B - Prateleira 02', employee: 'Manutenção Mecânica', obs: 'Revisão preventiva' },
  { date: '27/10/2026 - 11:30', code: 'PAT-1049', item: 'Esmerilhadeira Angular 7"', type: 'Devolução', location: 'Oficina Central > Armário 03', employee: 'Marcos Vinícius', obs: 'Entregue em perfeito estado' }
];

let items = JSON.parse(localStorage.getItem('vale_items')) || [...DEFAULT_ITEMS];
let currentMoves = JSON.parse(localStorage.getItem('vale_moves')) || [...DEFAULT_MOVEMENTS];
let warehouses = ['Galpão A', 'Galpão B', 'Oficina Central'];
let isApiOnline = false;
let mediaStream = null;

function saveLocalState() {
  localStorage.setItem('vale_items', JSON.stringify(items));
  localStorage.setItem('vale_moves', JSON.stringify(currentMoves));
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}

/* ==========================================================================
   CONTROLE DE SESSÃO, PERMISSÕES POR CARGO E BOTÃO DE LOGOUT
   Perfis: 'gerente' (total), 'almoxarife' (cadastro + estoque), 'funcionario' (operação)
   ========================================================================== */
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('valeLocalizaUser') || sessionStorage.getItem('valeLocalizaUser');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      username: parsed.username || 'usuario',
      name: parsed.name || 'Colaborador',
      matricula: parsed.matricula || '0000',
      role: parsed.role || 'funcionario',
      roleLabel: parsed.roleLabel || 'Funcionário'
    };
  } catch (e) {
    return null;
  }
}

function hasRole(...allowedRoles) {
  const user = getCurrentUser();
  return user ? allowedRoles.includes(user.role) : false;
}

function initAuthGuard() {
  const path = window.location.pathname.toLowerCase();
  const isLoginPage = path.endsWith('login.html');
  const user = getCurrentUser();

  // 1. Redireciona para o login se não estiver autenticado
  if (!isLoginPage && !user) {
    window.location.href = 'login.html';
    return false;
  }

  if (!user) return true;

  // 2. Bloqueia acesso direto à página de Cadastro para Funcionários
  if (path.includes('cadastrar.html') && user.role === 'funcionario') {
    window.location.href = 'index.html?acesso=negado';
    return false;
  }

  // Exibe aviso na home caso o funcionário tenha tentado acessar área restrita
  if (path.endsWith('index.html') && window.location.search.includes('acesso=negado')) {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      const warnDiv = document.createElement('div');
      warnDiv.style.cssText = 'background:#fef2f2; color:#b91c1c; border-left:4px solid #dc2626; padding:0.9rem 1.2rem; border-radius:8px; margin-bottom:1.25rem; font-weight:500;';
      warnDiv.textContent = 'Acesso restrito: apenas perfis de Almoxarife ou Gerente podem cadastrar novos ativos no inventário.';
      mainEl.prepend(warnDiv);
    }
  }

  // 3. Ajusta o menu de navegação conforme o cargo
  const navList = document.querySelector('header nav ul');
  if (navList) {
    // Oculta o link "Cadastrar" para Funcionário
    if (user.role === 'funcionario') {
      const cadLink = navList.querySelector('a[href*="cadastrar.html"]');
      if (cadLink && cadLink.parentElement) {
        cadLink.parentElement.style.display = 'none';
      }
    }

    // Adiciona crachá com Nome + Cargo no menu
    const roleColors = {
      gerente:     { bg: '#fef3c7', color: '#92400e' },
      almoxarife:  { bg: '#e0f2fe', color: '#075985' },
      funcionario: { bg: '#dcfce7', color: '#166534' }
    };
    const badgeStyle = roleColors[user.role] || roleColors.funcionario;

    const profileLi = document.createElement('li');
    profileLi.style.cssText = 'display:flex; align-items:center;';
    profileLi.innerHTML = `
      <span style="background:${badgeStyle.bg}; color:${badgeStyle.color}; padding:0.25rem 0.65rem; border-radius:999px; font-size:0.78rem; font-weight:700; white-space:nowrap;">
        ${esc(user.name.split(' ')[0])} · ${esc(user.roleLabel)}
      </span>
    `;
    navList.appendChild(profileLi);

    // Adiciona o botão "Sair"
    const logoutLi = document.createElement('li');
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Sair';
    logoutLink.style.color = '#d93434';
    logoutLink.style.fontWeight = '600';

    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('valeLocalizaUser');
      sessionStorage.removeItem('valeLocalizaUser');
      window.location.href = 'login.html';
    });

    logoutLi.appendChild(logoutLink);
    navList.appendChild(logoutLi);
  }

  return true;
}

/* ==========================================================================
   INICIALIZAÇÃO GLOBAL (Detecta qual página está aberta)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // 0. Verifica autenticação e aplica regras do cargo
  if (!initAuthGuard()) return;

  // 1. Se for a versão SPA (index.html com #page-busca)
  if ($('page-busca')) {
    initSpaApp();
  }

  // 2. Se for a página de Leitura de Código / Scanner (leitura.html)
  if (window.location.pathname.includes('leitura.html') || document.title.includes('Leitura de Código')) {
    initScannerPage();
  }

  // 3. Se for a página Inicial ou Pesquisar multipáginas (index.html / pesquisar.html)
  if (window.location.pathname.includes('index.html') || window.location.pathname.includes('pesquisar.html')) {
    initMultiPageSearch();
  }

  // 4. Se for a página de Histórico multipáginas (historico.html)
  if (window.location.pathname.includes('historico.html')) {
    initMultiPageHistory();
  }

  // 5. Se for a página de Cadastro (cadastrar.html)
  if (window.location.pathname.includes('cadastrar.html') || $('registerForm')) {
    initRegisterPage();
  }
});

/* ==========================================================================
   MÓDULO 1: LEITOR DE CÓDIGO DE PATRIMÔNIO / QR CODE (leitura.html)
   ========================================================================== */
function initScannerPage() {
  const container = document.querySelector('.hero-section') || document.querySelector('main');
  if (!container) return;

  const scannerBox = container.querySelector('div[style*="dashed"]') || container.querySelector('.scanner-box');
  if (!scannerBox) return;

  const currentUser = getCurrentUser();
  const canManageCatalog = hasRole('gerente', 'almoxarife');

  scannerBox.innerHTML = `
    <div style="position:relative; width:100%; max-width:420px; margin:0 auto; overflow:hidden; border-radius:10px; background:#111; border: 2px solid var(--color-primary);">
      <video id="scannerVideo" autoplay playsinline style="width:100%; height:260px; object-fit:cover; display:block;"></video>
      <div style="position:absolute; top:50%; left:8%; right:8%; height:3px; background:var(--color-secondary); box-shadow:0 0 10px var(--color-secondary);"></div>
    </div>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:1.25rem; flex-wrap:wrap;">
      <button id="startCameraBtn" style="background:var(--color-primary); color:#fff; border:none; padding:0.7rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:600;">📷 Ligar Câmera</button>
      <button id="stopCameraBtn" style="background:#dc3545; color:#fff; border:none; padding:0.7rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:600;">⏹ Desligar</button>
      <button id="simulateScanBtn" style="background:var(--color-secondary); color:#212529; border:none; padding:0.7rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:600;">⚡ Simular Leitura</button>
    </div>
    <div style="margin-top:1rem; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
      <input type="text" id="manualCodeInput" placeholder="Ou digite o código (ex: PAT-2201)" style="padding:0.6rem 1rem; border:2px solid var(--border-color); border-radius:8px; font-size:0.95rem;">
      <button id="manualSearchBtn" style="background:#212529; color:#fff; border:none; padding:0.6rem 1.1rem; border-radius:8px; cursor:pointer; font-weight:500;">Consultar Código</button>
    </div>
    <div id="scanResult" style="margin-top:1.25rem; padding:1.2rem; background:#fff; border-radius:10px; border:2px solid var(--color-primary); text-align:left; display:none;"></div>
  `;

  const video = $('scannerVideo');
  const startBtn = $('startCameraBtn');
  const stopBtn = $('stopCameraBtn');
  const simulateBtn = $('simulateScanBtn');
  const manualInput = $('manualCodeInput');
  const manualBtn = $('manualSearchBtn');
  const resultDiv = $('scanResult');

  function showScannedItem(code) {
    const cleanCode = code.toUpperCase().trim();
    const item = items.find(i => i.code.toUpperCase() === cleanCode);
    resultDiv.style.display = 'block';

    if (!item) {
      resultDiv.style.borderColor = '#dc3545';
      resultDiv.innerHTML = canManageCatalog
        ? `
          <p style="color:#dc3545; font-weight:600; margin-bottom:0.8rem;">Esse código não está cadastrado</p>
          <a href="cadastrar.html?code=${encodeURIComponent(cleanCode)}" style="display:inline-block; background:var(--color-primary); color:#fff; text-decoration:none; padding:0.6rem 1.2rem; border-radius:6px; font-weight:600; font-size:0.95rem;">+ Cadastrar Código</a>
        `
        : `
          <p style="color:#dc3545; font-weight:600; margin-bottom:0.4rem;">Esse código não está cadastrado</p>
          <p style="color:#495057; font-size:0.88rem;">Solicite ao <strong>Almoxarife</strong> ou <strong>Gerente</strong> para cadastrar a etiqueta <strong>${esc(cleanCode)}</strong> no inventário.</p>
        `;
      return;
    }

    resultDiv.style.borderColor = 'var(--color-primary)';
    const isAvail = item.status === 'Disponível';
    const isMaint = item.status === 'Em Manutenção';

    let actionHtml = '';
    if (isAvail) {
      actionHtml = `<button id="quickWithdrawBtn" style="background:var(--color-primary); color:#fff; border:none; padding:0.55rem 1rem; border-radius:6px; cursor:pointer; font-weight:600;">Registrar Retirada</button>`;
    } else if (isMaint && !canManageCatalog) {
      actionHtml = `<span style="color:#b45309; font-size:0.88rem; font-weight:600;">Item em manutenção — liberação restrita ao Almoxarife ou Gerente.</span>`;
    } else {
      actionHtml = `<button id="quickReturnBtn" style="background:#2B8A3E; color:#fff; border:none; padding:0.55rem 1rem; border-radius:6px; cursor:pointer; font-weight:600;">${isMaint ? 'Liberar da Manutenção' : 'Registrar Devolução'}</button>`;
    }

    resultDiv.innerHTML = `
      <h4 style="color:var(--color-primary); margin-bottom:0.5rem;">✓ Etiqueta Identificada: ${esc(item.code)}</h4>
      <p style="margin-bottom:0.3rem;"><strong>Item:</strong> ${esc(item.name)}</p>
      <p style="margin-bottom:0.3rem;"><strong>Categoria:</strong> ${esc(item.cat)}</p>
      <p style="margin-bottom:0.3rem;"><strong>Localização Exata:</strong> ${esc(item.loc)}</p>
      <p style="margin-bottom:0.8rem;"><strong>Estado Atual:</strong> <span style="color:${isAvail ? '#2B8A3E' : '#E67700'}; font-weight:700;">${esc(item.status)}</span></p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${actionHtml}
      </div>
    `;

    const wBtn = $('quickWithdrawBtn');
    const rBtn = $('quickReturnBtn');

    if (wBtn) {
      wBtn.addEventListener('click', () => {
        let emp = `${currentUser.name} (Mat. ${currentUser.matricula})`;

        // Gerente e Almoxarife podem registrar retirada para terceiros no balcão
        if (canManageCatalog) {
          const customEmp = prompt('Nome ou matrícula do colaborador que está retirando:', emp);
          if (!customEmp) return;
          emp = customEmp.trim();
        }

        item.status = 'Em Uso';
        item.employeeName = emp;
        currentMoves.unshift({
          date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
          code: item.code, item: item.name, type: 'Retirada', location: item.loc, employee: emp, obs: 'Via Leitor QR'
        });
        saveLocalState();
        showScannedItem(item.code);
      });
    }

    if (rBtn) {
      rBtn.addEventListener('click', () => {
        const obs = prompt('Estado na devolução (Ex: Perfeito estado, Danificado):', 'Perfeito estado');
        if (obs === null) return;
        item.status = obs.toLowerCase().includes('danific') ? 'Em Manutenção' : 'Disponível';
        currentMoves.unshift({
          date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
          code: item.code, item: item.name, type: 'Devolução', location: item.loc, employee: item.employeeName || currentUser.name, obs
        });
        item.employeeName = '';
        saveLocalState();
        showScannedItem(item.code);
      });
    }
  }

  startBtn.addEventListener('click', async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = mediaStream;
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<p style="color:var(--color-primary); font-weight:500;">📷 Câmera ativa! Aponte para o QR Code da etiqueta corporativa...</p>';

      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
        const scanInterval = setInterval(async () => {
          if (!mediaStream) { clearInterval(scanInterval); return; }
          try {
            const barcodes = await detector.detect(video);
            if (barcodes.length > 0) {
              showScannedItem(barcodes[0].rawValue);
            }
          } catch (e) {}
        }, 800);
      }
    } catch (err) {
      resultDiv.style.display = 'block';
      resultDiv.innerHTML = '<p style="color:#E67700;">⚠️ Câmera indisponível neste navegador/dispositivo. Use o botão <strong>Simular Leitura</strong> ou digite o código abaixo.</p>';
    }
  });

  stopBtn.addEventListener('click', () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
      mediaStream = null;
    }
    resultDiv.style.display = 'none';
  });

  simulateBtn.addEventListener('click', () => {
    const simulateUnknown = Math.random() < 0.35;
    if (simulateUnknown) {
      const randomCode = 'PAT-' + Math.floor(5000 + Math.random() * 4999);
      showScannedItem(randomCode);
    } else {
      const randomItem = items[Math.floor(Math.random() * items.length)];
      showScannedItem(randomItem.code);
    }
  });

  manualBtn.addEventListener('click', () => {
    if (manualInput.value.trim()) showScannedItem(manualInput.value);
  });

  manualInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && manualInput.value.trim()) showScannedItem(manualInput.value);
  });
}

/* ==========================================================================
   MÓDULO 2: BUSCA E TABELA INTERATIVA (index.html & pesquisar.html)
   ========================================================================== */
function initMultiPageSearch() {
  const searchInput = document.querySelector('.search-bar-container input');
  const tbody = document.querySelector('tbody');
  if (!tbody) return;

  if (searchInput) {
    const datalist = document.createElement('datalist');
    datalist.id = 'items-datalist';
    items.forEach(i => {
      const opt = document.createElement('option');
      opt.value = `${i.code} - ${i.name}`;
      datalist.appendChild(opt);
    });
    document.body.appendChild(datalist);
    searchInput.setAttribute('list', 'items-datalist');
  }

  const isPesquisarPage = window.location.pathname.includes('pesquisar.html');

  function renderMultiPageTable(filter = '') {
    const term = filter.toLowerCase().trim();
    const filtered = items.filter(i =>
      i.code.toLowerCase().includes(term) ||
      i.name.toLowerCase().includes(term) ||
      i.cat.toLowerCase().includes(term) ||
      i.loc.toLowerCase().includes(term)
    );

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="${isPesquisarPage ? 5 : 4}" style="text-align:center; color:#666;">Nenhum item encontrado para "${esc(filter)}".</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(i => {
      const isAvail = i.status === 'Disponível';
      const badge = `<span class="status-badge"><span class="status-dot ${isAvail ? 'available' : 'in-use'}"></span> ${esc(i.status)}</span>`;
      if (isPesquisarPage) {
        return `<tr>
          <td><strong>${esc(i.code)}</strong></td>
          <td>${esc(i.name)}</td>
          <td>${esc(i.cat)}</td>
          <td>${esc(i.loc)}</td>
          <td>${badge}</td>
        </tr>`;
      }
      return `<tr>
        <td><strong>${esc(i.code)}</strong></td>
        <td>${esc(i.name)}</td>
        <td>${esc(i.loc)}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');

    const sidebarList = document.querySelector('.sidebar-card ul');
    if (sidebarList) {
      const total = items.length;
      const avail = items.filter(i => i.status === 'Disponível').length;
      const inUse = items.filter(i => i.status === 'Em Uso').length;
      const maint = items.filter(i => i.status === 'Em Manutenção').length;
      sidebarList.innerHTML = `
        <li><span>Total de Itens:</span> <strong>${total}</strong></li>
        <li><span>Disponíveis:</span> <strong>${avail}</strong></li>
        <li><span>Em Uso:</span> <strong>${inUse}</strong></li>
        <li><span>Manutenção:</span> <strong>${maint}</strong></li>
      `;
    }
  }

  renderMultiPageTable();

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const val = e.target.value.includes(' - ') ? e.target.value.split(' - ')[0] : e.target.value;
      renderMultiPageTable(val);
    });
  }
}

/* ==========================================================================
   MÓDULO 3: HISTÓRICO AGRUPADO & DEVOLUÇÃO RÁPIDA (historico.html)
   ========================================================================== */
function initMultiPageHistory() {
  const tbody = document.querySelector('tbody');
  const tableContainer = document.querySelector('.table-container');
  if (!tbody) return;

  const currentUser = getCurrentUser();
  const isAuditorOrBoss = hasRole('gerente', 'almoxarife');

  // Exibe faixa informando o escopo de visualização do perfil
  if (tableContainer && currentUser) {
    const scopeBanner = document.createElement('div');
    scopeBanner.style.cssText = 'padding:0.65rem 0.9rem; border-radius:6px; margin-bottom:1rem; font-size:0.86rem; background:rgba(0,126,122,0.08); color:var(--color-primary); font-weight:500;';
    scopeBanner.textContent = isAuditorOrBoss
      ? `Visão de Auditoria (${currentUser.roleLabel}): exibindo todas as movimentações da unidade.`
      : `Visão Operacional (${currentUser.roleLabel}): exibindo apenas as movimentações vinculadas a ${currentUser.name}.`;
    const heading = tableContainer.querySelector('h3');
    if (heading) heading.insertAdjacentElement('afterend', scopeBanner);
  }

  function renderHistoryTable() {
    // Funcionário visualiza apenas seus próprios registros; Gerente e Almoxarife veem tudo
    const visibleMoves = isAuditorOrBoss
      ? currentMoves
      : currentMoves.filter(m =>
          (m.employee || '').toLowerCase().includes(currentUser.name.toLowerCase()) ||
          (m.employee || '').includes(currentUser.matricula)
        );

    if (!visibleMoves.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#666; padding:1.25rem;">Nenhuma movimentação encontrada para o seu usuário.</td></tr>`;
      return;
    }

    tbody.innerHTML = visibleMoves.map((m) => {
      const realIdx = currentMoves.indexOf(m);
      return `
        <tr>
          <td>${esc(m.date)}</td>
          <td><strong>${esc(m.code || '-')}</strong></td>
          <td>${esc(m.item)}</td>
          <td>${esc(m.employee)}</td>
          <td>
            <strong>${esc(m.type)}</strong>
            ${m.obs ? `<div style="font-size:0.8rem; color:#666;">Obs: ${esc(m.obs)}</div>` : ''}
            ${m.type === 'Retirada' ? `
              <div style="margin-top:6px;" id="return-box-${realIdx}">
                <button data-return-toggle="${realIdx}" style="background:var(--color-primary); color:#fff; border:none; padding:5px 12px; border-radius:6px; font-size:0.8rem; cursor:pointer; font-weight:600;">Registrar Devolução</button>
              </div>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-return-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.returnToggle;
        const box = document.getElementById(`return-box-${idx}`);
        box.innerHTML = `
          <div style="background:#f1f3f5; padding:8px; border-radius:6px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:6px; margin-top:4px;">
            <div style="font-size:0.8rem; font-weight:600; color:var(--color-text);">Selecione o estado do item:</div>
            <button data-action-return="ok" data-idx="${idx}" style="background:#2B8A3E; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600; text-align:left;">✓ Perfeito Estado (Disponível)</button>
            <button data-action-return="maint" data-idx="${idx}" style="background:#E67700; color:#fff; border:none; padding:5px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:600; text-align:left;">⚠️ Danificado (Manutenção)</button>
            <button data-action-return="cancel" data-idx="${idx}" style="background:#6c757d; color:#fff; border:none; padding:3px 6px; border-radius:4px; font-size:0.7rem; cursor:pointer; text-align:center;">Cancelar</button>
          </div>
        `;

        box.querySelectorAll('[data-action-return]').forEach(actionBtn => {
          actionBtn.addEventListener('click', () => {
            const actionType = actionBtn.dataset.actionReturn;
            if (actionType === 'cancel') {
              renderHistoryTable();
              return;
            }

            const move = currentMoves[idx];
            const isMaint = actionType === 'maint';
            const obs = isMaint ? 'Danificado / Manutenção' : 'Perfeito estado';

            const targetItem = items.find(i => i.code === move.code || i.name === move.item);
            if (targetItem) {
              targetItem.status = isMaint ? 'Em Manutenção' : 'Disponível';
              targetItem.employeeName = '';
            }

            currentMoves.unshift({
              date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
              code: move.code,
              item: move.item,
              type: 'Devolução',
              location: move.location,
              employee: move.employee,
              obs
            });

            saveLocalState();
            renderHistoryTable();
          });
        });
      });
    });
  }

  renderHistoryTable();
}

/* ==========================================================================
   MÓDULO 4: VERSÃO SPA COMPLETA (index.html com API Python/SQLite ou Fallback)
   ========================================================================== */
function initSpaApp() {
  const currentUser = getCurrentUser();

  function showPage(p) {
    document.querySelectorAll('[id^="page-"]').forEach(e => e.classList.add('hidden'));
    $('page-' + p).classList.remove('hidden');
    document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    if (p === 'mov') renderMoves();
    if (p === 'mapa') renderShelves();
    if (p === 'retirada') { populateWithdrawSelect(); updateWithdrawSummary(); }
    if (p === 'status') loadStatusCounts();
  }

  document.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.goto)));

  async function loadItems() {
    try {
      [items, warehouses] = await Promise.all([api('/api/items'), api('/api/warehouses')]);
      isApiOnline = true;
    } catch (e) {
      isApiOnline = false;
    }
    renderWarehouseOptions();
    renderWithdrawOptions();
    if ($('warehouseCount')) $('warehouseCount').textContent = warehouses.length;
    await search(false);
  }

  function showMessage(message, error = false) {
    if (!$('message')) return;
    $('message').classList.remove('hidden');
    $('message').textContent = message;
    $('message').style.background = error ? '#fff4e5' : '#eaf6ee';
    $('message').style.color = error ? '#855500' : '#155e37';
  }

  function statusClass(i) {
    return i.status === 'Disponível' ? '' : 'warn';
  }

  function actionButtons(i) {
    let actions = [];
    const isGerente = hasRole('gerente');
    const isAlmoxarife = hasRole('almoxarife');

    if (i.status === 'Disponível') {
      actions.push(['withdraw', 'Retirar']);
      if (isGerente || isAlmoxarife) actions.push(['maintenance', 'Enviar à manutenção']);
      if (isGerente) actions.push(['lost', 'Marcar perdido']);
    }
    if (i.status === 'Em Uso') {
      actions.push(['return', 'Registrar devolução']);
      if (isGerente) actions.push(['lost', 'Marcar perdido']);
    }
    if (i.status === 'Em Manutenção' && (isGerente || isAlmoxarife)) {
      actions.push(['maintenance_return', 'Retorno da manutenção']);
    }
    if (i.status === 'Perdido' && isGerente) {
      actions.push(['found', 'Registrar item localizado']);
    }
    return actions.map(([a, label]) => `<button class="smallbtn" data-action="${a}" data-code="${esc(i.code)}">${label}</button>`).join(' ');
  }

  async function search(showNotice = true) {
    const q = $('q').value.trim().toLowerCase();
    const cat = $('cat').value;
    const sector = $('sector').value;
    const status = $('status').value;

    let found = [];
    if (isApiOnline) {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (cat) params.set('category', cat);
      if (sector) params.set('sector', sector);
      if (status) params.set('status', status);
      found = await api('/api/items?' + params.toString());
      items = await api('/api/items');
    } else {
      found = items.filter(i => {
        const matchQ = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
        const matchCat = !cat || i.cat === cat;
        const matchSec = !sector || i.sector === sector;
        const matchSt = !status || i.status === status;
        return matchQ && matchCat && matchSec && matchSt;
      });
    }

    if (showNotice) {
      showMessage(found.length ? `${found.length} material(is) encontrado(s).` : 'Nenhum material encontrado.');
    }

    const box = $('results');
    if (!found.length) {
      box.className = 'empty';
      box.innerHTML = '<div style="font-size:46px">⌕</div><div class="empty-text">Nenhum material encontrado</div>';
      return;
    }

    box.className = 'results';
    box.innerHTML = found.map(i => `
      <article class="result">
        <div>
          <div class="item-name">${esc(i.name)}</div>
          <div class="item-meta">${esc(i.code)} · ${esc(i.cat)} · ${esc(i.sector)}</div>
          <div class="item-meta">Local: ${esc(i.loc)}</div>
          ${i.employee || i.employeeName ? `<div class="item-meta">Responsável: ${esc(i.employeeName || i.employee)}</div>` : ''}
        </div>
        <div style="display:flex;align-items:flex-end;gap:8px;flex-direction:column;max-width:100%">
          <span class="pill ${statusClass(i)}">${esc(i.status)}</span>
          <button class="smallbtn" data-locate="${esc(i.code)}">Ver localização</button>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${actionButtons(i)}</div>
        </div>
      </article>
    `).join('');

    box.querySelectorAll('[data-locate]').forEach(b => b.addEventListener('click', () => locate(b.dataset.locate)));
    box.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => performAction(b.dataset.code, b.dataset.action)));
    renderWithdrawOptions();
  }

  function locate(code) {
    const i = items.find(x => x.code === code);
    if (!i) return;
    showPage('mapa');
    $('shelfInfo').classList.remove('hidden');
    $('shelfInfo').textContent = `${i.name} (${i.code}) — ${i.loc}. Status: ${i.status}.`;
    renderShelves(i);
  }

  $('search').addEventListener('click', () => search());
  $('q').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
  ['cat', 'sector', 'status'].forEach(id => $(id).addEventListener('change', () => search()));

  function renderShelves(selected) {
    const container = $('warehouses-container');
    container.innerHTML = warehouses.map(galpao => {
      const galpaoItems = items.filter(i => i.sector === galpao || (i.loc && i.loc.includes(galpao)));
      const nums = Array.from({ length: 12 }, (_, n) => n + 1);
      const buttons = nums.map(num => {
        let pad = String(num).padStart(2, '0');
        let shelfName = 'Prateleira ' + pad;
        let hasItems = galpaoItems.some(i => i.prateleira === shelfName || (i.loc && i.loc.includes(shelfName)));
        let isSel = selected && (selected.sector === galpao || (selected.loc && selected.loc.includes(galpao))) && (selected.prateleira === shelfName || (selected.loc && selected.loc.includes(shelfName)));
        return `<button class="shelf" data-galpao="${esc(galpao)}" data-shelf="${pad}" style="border:1px solid ${isSel ? '#16804a' : (hasItems ? '#8ab9a0' : '#dbe5e1')};background:${isSel ? '#e6f5eb' : (hasItems ? '#f1faf4' : '#f7faf8')};border-radius:10px;padding:18px 8px;color:#173b2c;font-weight:700;min-height:78px"><span style="display:block;font-size:22px">▤</span>Prateleira ${pad}${hasItems ? '<span style="display:block;font-size:11px;color:#08783f;margin-top:4px">● Com material</span>' : ''}</button>`;
      }).join('');
      return `<div class="panel"><h3>${esc(galpao)} — visão simplificada</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${buttons}</div></div>`;
    }).join('');
  }

  async function renderMoves() {
    if (isApiOnline) {
      currentMoves = await api('/api/movements');
    }
    $('moves').innerHTML = currentMoves.length
      ? currentMoves.map(m => `<tr><td>${esc(m.date)}</td><td>${esc(m.item)}</td><td>${esc(m.type)}</td><td>${esc(m.location)}</td><td>${esc(m.employee)}</td></tr>`).join('')
      : '<tr><td colspan="5">Nenhuma movimentação registrada até agora.</td></tr>';
  }

  $('newMove').addEventListener('click', () => {
    showPage('busca');
    showMessage('Para registrar uma movimentação, use os botões de ação de cada material na lista de busca.');
  });

  function renderWithdrawOptions() {
    const select = $('withdrawItem');
    if (!select) return;
    const selected = select.value;
    const available = items.filter(i => i.status === 'Disponível');
    select.innerHTML = available.map(i => `<option value="${esc(i.code)}">${esc(i.code)} — ${esc(i.name)}</option>`).join('') || '<option value="">Nenhum material disponível</option>';
    if (available.some(i => i.code === selected)) select.value = selected;
  }

  function renderWarehouseOptions() {
    const select = $('sector');
    if (!select) return;
    select.innerHTML = '<option value="">⚑ Setor: todos</option>' + warehouses.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
  }

  function populateWithdrawSelect() {
    renderWithdrawOptions();
    if (currentUser && currentUser.role === 'funcionario' && $('employeeId')) {
      $('employeeId').value = currentUser.matricula;
    }
  }

  function updateWithdrawSummary() {
    const i = items.find(x => x.code === $('withdrawItem').value);
    if (!i) {
      $('withdrawItemInfo').textContent = 'Nenhum material disponível no cadastro.';
      $('withdrawSummary').textContent = 'Selecione um material para conferir os dados.';
      return;
    }
    $('withdrawItemInfo').textContent = `${i.code} · ${i.cat} · ${i.sector} · Status atual: ${i.status}`;
    $('withdrawSummary').textContent = `${i.name} — ${i.loc}. Status: ${i.status}.`;
  }

  $('withdrawItem').addEventListener('change', () => {
    $('withdrawNotice').classList.add('hidden');
    updateWithdrawSummary();
  });

  async function confirmWithdrawal() {
    const code = $('withdrawItem').value;
    const matricula = $('employeeId').value.trim();
    if (!matricula) return alert('Informe a matrícula do colaborador.');
    $('withdrawNotice').classList.remove('hidden');

    if (isApiOnline) {
      const result = await api(`/api/items/${encodeURIComponent(code)}/action`, {
        method: 'POST', body: JSON.stringify({ action: 'withdraw', matricula })
      });
      $('withdrawNotice').textContent = `Retirada confirmada! ${result.item.name} (${result.item.code}) agora está “${result.item.status}”.`;
    } else {
      const item = items.find(x => x.code === code);
      if (item) {
        item.status = 'Em Uso';
        item.employee = matricula;
        item.employeeName = `Matrícula ${matricula}`;
        currentMoves.unshift({
          date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
          code: item.code, item: item.name, type: 'Retirada', location: item.loc, employee: item.employeeName, obs: ''
        });
        saveLocalState();
        $('withdrawNotice').style.background = '#eaf6ee';
        $('withdrawNotice').style.color = '#155e37';
        $('withdrawNotice').textContent = `Retirada confirmada! ${item.name} (${item.code}) agora está “Em Uso”.`;
      }
    }
    $('employeeId').value = '';
    await refreshAll();
  }

  $('confirmWithdraw').addEventListener('click', confirmWithdrawal);

  async function performAction(code, action) {
    const labels = {
      withdraw: 'retirar este material', return: 'registrar a devolução',
      maintenance: 'enviar à manutenção', maintenance_return: 'registrar o retorno da manutenção',
      lost: 'marcar este item como perdido', found: 'registrar que o item foi localizado'
    };
    const defaultMat = currentUser ? currentUser.matricula : '';
    let matricula = prompt(`Digite a matrícula do colaborador para ${labels[action]}:`, defaultMat);
    if (matricula === null) return;
    let observacao = prompt('Observação (opcional):', '') || '';

    if (isApiOnline) {
      const result = await api(`/api/items/${encodeURIComponent(code)}/action`, {
        method: 'POST', body: JSON.stringify({ action, matricula, observacao })
      });
      showMessage(`${result.message} ${result.item.name}: ${result.item.status}.`);
    } else {
      const item = items.find(x => x.code === code);
      if (item) {
        const statusMap = {
          withdraw: 'Em Uso', return: 'Disponível', maintenance: 'Em Manutenção',
          maintenance_return: 'Disponível', lost: 'Perdido', found: 'Disponível'
        };
        item.status = statusMap[action] || item.status;
        item.employee = action === 'withdraw' ? matricula : '';
        item.employeeName = action === 'withdraw' ? `Matrícula ${matricula}` : '';
        currentMoves.unshift({
          date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
          code: item.code, item: item.name, type: labels[action], location: item.loc, employee: `Matrícula ${matricula}`, obs: observacao
        });
        saveLocalState();
        showMessage(`Operação concluída! ${item.name}: ${item.status}.`);
      }
    }
    await refreshAll();
  }

  async function loadStatusCounts() {
    document.querySelectorAll('#page-status .status-list .panel').forEach(card => {
      const label = card.querySelector('h3')?.textContent?.trim();
      const total = items.filter(i => i.status === label).length;
      let badge = card.querySelector('.pill');
      if (badge) badge.textContent = `${total} item(ns)`;
    });
  }

  async function refreshAll() {
    if (isApiOnline) items = await api('/api/items');
    renderWithdrawOptions();
    updateWithdrawSummary();
    await search(false);
    if (!$('page-mov').classList.contains('hidden')) await renderMoves();
    if (!$('page-status').classList.contains('hidden')) await loadStatusCounts();
    if (!$('page-mapa').classList.contains('hidden')) renderShelves();
  }

  loadItems();
}

/* ==========================================================================
   MÓDULO 5: CADASTRO DE PRODUTOS E CÓDIGOS (cadastrar.html)
   ========================================================================== */
function initRegisterPage() {
  const form = $('registerForm');
  const feedback = $('registerFeedback');
  const recentList = $('recentRegisteredList');
  if (!form) return;

  const currentUser = getCurrentUser();

  function renderRecentItems() {
    if (!recentList) return;
    const latest = items.slice(0, 6);
    recentList.innerHTML = latest.map(i => `
      <li style="flex-direction: column; gap: 2px;">
        <div><strong>${esc(i.code)}</strong> — ${esc(i.name)}</div>
        <span style="font-size: 0.8rem; color: #666;">${esc(i.loc)} (${esc(i.status)})</span>
      </li>
    `).join('');
  }

  renderRecentItems();

  const urlParams = new URLSearchParams(window.location.search);
  const prefillCode = urlParams.get('code');
  if (prefillCode && $('prodCode')) {
    $('prodCode').value = prefillCode.toUpperCase();
    if ($('prodName')) $('prodName').focus();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const code = $('prodCode').value.trim().toUpperCase();
    const name = $('prodName').value.trim();
    const cat = $('prodCat').value;
    const sector = $('prodSector').value;
    const loc = $('prodLoc').value.trim();

    if (!code || !name || !loc) return;

    const exists = items.some(i => i.code.toUpperCase() === code);
    feedback.style.display = 'block';

    if (exists) {
      feedback.style.background = '#fff4e5';
      feedback.style.color = '#855500';
      feedback.style.border = '1px solid #ffd8a8';
      feedback.textContent = `⚠️ O código "${code}" já está cadastrado no sistema.`;
      return;
    }

    const newItem = {
      code,
      name,
      cat,
      sector,
      prateleira: loc,
      loc,
      status: 'Disponível',
      employee: '',
      employeeName: ''
    };

    items.unshift(newItem);
    currentMoves.unshift({
      date: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      code,
      item: name,
      type: 'Cadastro Inicial',
      location: loc,
      employee: currentUser ? `${currentUser.name} (${currentUser.roleLabel})` : 'Almoxarifado',
      obs: 'Novo item adicionado ao sistema'
    });

    saveLocalState();
    renderRecentItems();

    feedback.style.background = '#eaf6ee';
    feedback.style.color = '#155e37';
    feedback.style.border = '1px solid #b2f2bb';
    feedback.textContent = `✓ Produto "${name}" (${code}) cadastrado com sucesso e já disponível para busca e leitura!`;

    form.reset();
  });
}