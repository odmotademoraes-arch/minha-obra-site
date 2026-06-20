const { BrowserWindow } = require('electron')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

async function gerarPDF(htmlContent, nomeArquivo) {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, nodeIntegration: false, contextIsolation: true },
  })

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
  await new Promise(r => setTimeout(r, 500))

  const pdf = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { marginType: 'custom', top: 15, bottom: 15, left: 15, right: 15 },
  })

  win.close()

  const outputPath = path.join(os.homedir(), 'Downloads', nomeArquivo)
  fs.writeFileSync(outputPath, pdf)
  return outputPath
}

const estiloBase = `
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #1F2937; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1E3A5F; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 22px; font-weight: 900; color: #1E3A5F; letter-spacing: -0.5px; }
    .logo span { color: #F97316; }
    .section { background: #F9FAFB; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #1E3A5F; }
    .section-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6B7280; letter-spacing: 0.5px; margin-bottom: 8px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .field { margin-bottom: 10px; }
    .label { font-size: 10px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
    .value { font-size: 13px; color: #1F2937; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge-verde { background: #D1FAE5; color: #065F46; }
    .badge-amarelo { background: #FEF3C7; color: #92400E; }
    .badge-vermelho { background: #FEE2E2; color: #991B1B; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1E3A5F; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .assinatura-box { border-top: 2px solid #E5E7EB; padding-top: 20px; margin-top: 32px; display: flex; gap: 40px; }
    .assinatura-campo { flex: 1; text-align: center; }
    .assinatura-linha { border-bottom: 1px solid #1F2937; height: 60px; margin-bottom: 6px; display: flex; align-items: flex-end; justify-content: center; }
    .footer { position: fixed; bottom: 15px; left: 40px; right: 40px; font-size: 9px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; padding-top: 6px; }
    .laranja { color: #F97316; }
    .azul { color: #1E3A5F; }
    .total-row td { font-weight: 700; background: #EFF6FF; color: #1E3A5F; }
  </style>
`

function templateRDO(rdo, obra, funcionarios = []) {
  const dataFormatada = new Date(rdo.data + 'T00:00:00').toLocaleDateString('pt-BR')
  const nomes         = funcionarios.map(f => f.nome).join(', ') || '—'
  const statusBadge   = obra.status === 'andamento' ? 'badge-verde' : 'badge-amarelo'

  return `<!DOCTYPE html><html><head>${estiloBase}</head><body>
    <div class="header">
      <div>
        <div class="logo">MINHA <span>OBRA</span></div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Diário de Obra — RDO</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:600;color:#1E3A5F">${obra.nome}</div>
        <div style="font-size:11px;color:#6B7280">${dataFormatada}</div>
        <span class="badge ${statusBadge}" style="margin-top:4px">${obra.status || 'andamento'}</span>
      </div>
    </div>

    <div class="grid-2">
      <div class="section">
        <div class="section-title">Identificação da Obra</div>
        <div class="field"><div class="label">Nome</div><div class="value">${obra.nome}</div></div>
        <div class="field"><div class="label">Endereço</div><div class="value">${obra.endereco || '—'}</div></div>
        <div class="field"><div class="label">Engenheiro Responsável</div><div class="value">${obra.engenheiro_responsavel || '—'}</div></div>
        ${obra.art_rrt ? `<div class="field"><div class="label">ART/RRT</div><div class="value">${obra.art_rrt}</div></div>` : ''}
      </div>
      <div class="section">
        <div class="section-title">Informações do Dia</div>
        <div class="field"><div class="label">Data</div><div class="value">${dataFormatada}</div></div>
        <div class="field"><div class="label">Clima</div><div class="value">${rdo.clima || '—'}</div></div>
        <div class="field"><div class="label">Funcionários Presentes</div><div class="value">${funcionarios.length}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Equipe Presente</div>
      <div class="value">${nomes}</div>
    </div>

    <div class="section">
      <div class="section-title">Atividades Realizadas</div>
      <div class="value" style="white-space:pre-wrap;line-height:1.6">${rdo.atividades || '—'}</div>
    </div>

    <div class="section">
      <div class="section-title">Ocorrências e Incidentes</div>
      <div class="value" style="white-space:pre-wrap;line-height:1.6">${rdo.ocorrencias || 'Nenhuma ocorrência registrada.'}</div>
    </div>

    <div class="section">
      <div class="section-title">Materiais Recebidos</div>
      <div class="value" style="white-space:pre-wrap;line-height:1.6">${rdo.materiais_recebidos || '—'}</div>
    </div>

    <div class="assinatura-box">
      <div class="assinatura-campo">
        <div class="assinatura-linha">
          ${rdo.assinatura_url ? `<img src="${rdo.assinatura_url}" style="max-height:55px"/>` : ''}
        </div>
        <div style="font-size:11px;color:#6B7280">${obra.engenheiro_responsavel || 'Engenheiro Responsável'}</div>
        <div style="font-size:10px;color:#9CA3AF">Assinatura Digital</div>
      </div>
      <div class="assinatura-campo">
        <div class="assinatura-linha"></div>
        <div style="font-size:11px;color:#6B7280">Fiscal / Responsável</div>
        <div style="font-size:10px;color:#9CA3AF">Assinatura</div>
      </div>
    </div>

    <div class="footer">© ${new Date().getFullYear()} Minha Obra · ${obra.nome} · RDO ${dataFormatada} · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </body></html>`
}

function templateFinanceiro(despesas = [], obra) {
  const total       = despesas.reduce((a, d) => a + Number(d.valor || 0), 0)
  const orcamento   = Number(obra.orcamento_total || 0)
  const pct         = orcamento ? ((total / orcamento) * 100).toFixed(1) : '—'
  const statusCor   = pct !== '—' && Number(pct) >= 100 ? 'badge-vermelho' : Number(pct) >= 80 ? 'badge-amarelo' : 'badge-verde'

  const linhas = despesas.map(d => `
    <tr>
      <td>${new Date(d.data_lancamento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
      <td>${d.categoria?.replace('_', ' ') || '—'}</td>
      <td>${d.descricao}</td>
      <td>${d.fornecedor || '—'}</td>
      <td>${d.nota_fiscal || '—'}</td>
      <td style="text-align:right;font-weight:600">R$ ${Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html><html><head>${estiloBase}</head><body>
    <div class="header">
      <div>
        <div class="logo">MINHA <span>OBRA</span></div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Relatório Financeiro</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;font-weight:600;color:#1E3A5F">${obra.nome}</div>
        <div style="font-size:11px;color:#6B7280">Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
    </div>

    <div class="grid-3">
      <div class="section">
        <div class="section-title">Total Gasto</div>
        <div style="font-size:20px;font-weight:700;color:#1E3A5F">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="section">
        <div class="section-title">Orçamento Total</div>
        <div style="font-size:20px;font-weight:700;color:#1E3A5F">R$ ${orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="section">
        <div class="section-title">Consumo do Orçamento</div>
        <div style="font-size:20px;font-weight:700"><span class="badge ${statusCor}">${pct}%</span></div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th>Data</th><th>Categoria</th><th>Descrição</th><th>Fornecedor</th><th>NF</th><th style="text-align:right">Valor</th>
      </tr></thead>
      <tbody>
        ${linhas}
        <tr class="total-row">
          <td colspan="5" style="text-align:right;font-weight:700">TOTAL</td>
          <td style="text-align:right">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">© ${new Date().getFullYear()} Minha Obra · Relatório Financeiro · ${obra.nome} · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </body></html>`
}

function templateFichaFuncionario(f, treinamentos = [], exames = [], epis = []) {
  const statusBadge = f.status === 'ativo' ? 'badge-verde' : f.status === 'afastado' ? 'badge-amarelo' : 'badge-vermelho'

  return `<!DOCTYPE html><html><head>${estiloBase}</head><body>
    <div class="header">
      <div>
        <div class="logo">MINHA <span>OBRA</span></div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">Ficha de Funcionário</div>
      </div>
      <div style="text-align:right">
        <span class="badge ${statusBadge}">${f.status || 'ativo'}</span>
        ${f.matricula ? `<div style="font-size:11px;color:#6B7280;margin-top:4px">Mat. ${f.matricula}</div>` : ''}
      </div>
    </div>

    <div class="grid-2">
      <div class="section">
        <div class="section-title">Dados Pessoais</div>
        <div class="field"><div class="label">Nome</div><div class="value" style="font-size:16px;font-weight:700">${f.nome}</div></div>
        <div class="field"><div class="label">CPF</div><div class="value">${f.cpf || '—'}</div></div>
        <div class="field"><div class="label">RG</div><div class="value">${f.rg || '—'}</div></div>
        <div class="field"><div class="label">Data de Nascimento</div><div class="value">${f.data_nascimento ? new Date(f.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div></div>
        <div class="field"><div class="label">Tipo Sanguíneo</div><div class="value">${f.tipo_sanguineo || '—'}</div></div>
      </div>
      <div class="section">
        <div class="section-title">Dados Profissionais</div>
        <div class="field"><div class="label">Cargo</div><div class="value" style="font-weight:600">${f.cargo_personalizado || f.cargo}</div></div>
        <div class="field"><div class="label">Data de Admissão</div><div class="value">${f.data_admissao ? new Date(f.data_admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</div></div>
        <div class="field"><div class="label">E-mail</div><div class="value">${f.email || '—'}</div></div>
        <div class="field"><div class="label">Celular</div><div class="value">${f.celular || '—'}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Contato de Emergência</div>
      <div class="grid-2">
        <div class="field"><div class="label">Nome</div><div class="value">${f.contato_emergencia || '—'}</div></div>
        <div class="field"><div class="label">Telefone</div><div class="value">${f.telefone_emergencia || '—'}</div></div>
      </div>
    </div>

    ${treinamentos.length ? `
    <div class="section">
      <div class="section-title">Treinamentos (NRs)</div>
      <table>
        <thead><tr><th>NR</th><th>Conclusão</th><th>Validade</th><th>Status</th></tr></thead>
        <tbody>
          ${treinamentos.map(t => {
            const vencido = t.data_validade && new Date(t.data_validade) < new Date()
            return `<tr>
              <td>${t.nr}</td>
              <td>${t.data_conclusao ? new Date(t.data_conclusao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
              <td>${t.data_validade ? new Date(t.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
              <td><span class="badge ${vencido ? 'badge-vermelho' : 'badge-verde'}">${vencido ? 'Vencido' : 'Válido'}</span></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    ${exames.length ? `
    <div class="section">
      <div class="section-title">Exames Médicos (ASO)</div>
      <table>
        <thead><tr><th>Tipo</th><th>Realização</th><th>Validade</th><th>Resultado</th></tr></thead>
        <tbody>
          ${exames.map(e => {
            const vencido = e.data_validade && new Date(e.data_validade) < new Date()
            return `<tr>
              <td>${e.tipo}</td>
              <td>${e.data_realizacao ? new Date(e.data_realizacao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
              <td>${e.data_validade ? new Date(e.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
              <td><span class="badge ${vencido ? 'badge-vermelho' : 'badge-verde'}">${e.resultado || (vencido ? 'Vencido' : 'Válido')}</span></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="footer">© ${new Date().getFullYear()} Minha Obra · Ficha de Funcionário · ${f.nome} · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </body></html>`
}

module.exports = { gerarPDF, templateRDO, templateFinanceiro, templateFichaFuncionario }
