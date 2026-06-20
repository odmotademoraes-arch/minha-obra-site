const XLSX = require('xlsx')
const path = require('path')
const os   = require('os')

function salvar(wb, nome) {
  const outputPath = path.join(os.homedir(), 'Downloads', nome)
  XLSX.writeFile(wb, outputPath)
  return outputPath
}

function exportarFuncionarios(funcionarios = []) {
  const dados = funcionarios.map(f => ({
    'Matrícula':       f.matricula || '—',
    'Nome':            f.nome,
    'CPF':             f.cpf || '—',
    'RG':              f.rg || '—',
    'Cargo':           f.cargo_personalizado || f.cargo,
    'E-mail':          f.email || '—',
    'Celular':         f.celular || '—',
    'Admissão':        f.data_admissao || '—',
    'Status':          f.status,
    'Tipo Sanguíneo':  f.tipo_sanguineo || '—',
    'Contato Emerg.':  f.contato_emergencia || '—',
    'Tel. Emergência': f.telefone_emergencia || '—',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  ws['!cols'] = [10, 30, 15, 12, 20, 25, 15, 12, 12, 12, 25, 16].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'Funcionários')
  return salvar(wb, `funcionarios_${new Date().toISOString().split('T')[0]}.xlsx`)
}

function exportarFinanceiro(despesas = [], obra) {
  const dados = despesas.map(d => ({
    'Data':           d.data_lancamento,
    'Categoria':      d.categoria?.replace(/_/g, ' ') || '—',
    'Descrição':      d.descricao,
    'Fornecedor':     d.fornecedor || '—',
    'Nota Fiscal':    d.nota_fiscal || '—',
    'Valor (R$)':     Number(d.valor),
  }))

  const total = despesas.reduce((a, d) => a + Number(d.valor || 0), 0)
  dados.push({ 'Descrição': 'TOTAL', 'Valor (R$)': total })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  ws['!cols'] = [12, 18, 35, 25, 15, 14].map(w => ({ wch: w }))

  // Formatar coluna de valor como moeda
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 5 })]
    if (cell && cell.t === 'n') cell.z = 'R$ #,##0.00'
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Financeiro')
  const nomeArq = obra?.nome
    ? `financeiro_${obra.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `financeiro_${new Date().toISOString().split('T')[0]}.xlsx`
  return salvar(wb, nomeArq)
}

function exportarPonto(registros = []) {
  const dados = registros.map(r => ({
    'Funcionário': r.funcionarios?.nome || r.funcionario_id,
    'Data':        r.data,
    'Entrada':     r.entrada || '—',
    'Saída':       r.saida || '—',
    'Horas Trab.': Number(r.horas_trabalhadas || 0),
    'Horas Extras': Number(r.horas_extras || 0),
    'Obra':        r.obras?.nome || '—',
    'Observação':  r.observacao || '—',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  ws['!cols'] = [28, 12, 10, 10, 12, 12, 25, 30].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'Ponto')
  return salvar(wb, `ponto_${new Date().toISOString().split('T')[0]}.xlsx`)
}

function exportarMateriais(materiais = [], obra) {
  const dados = materiais.map(m => ({
    'Código':           m.codigo || '—',
    'Nome':             m.nome,
    'Unidade':          m.unidade || '—',
    'Fornecedor':       m.fornecedor_padrao || '—',
    'Estoque Atual':    Number(m.estoque_atual || 0),
    'Estoque Mínimo':   Number(m.estoque_minimo || 0),
    'Preço Unit. (R$)': Number(m.preco_unitario || 0),
    'Situação':         Number(m.estoque_atual || 0) <= Number(m.estoque_minimo || 0) ? 'ABAIXO DO MÍNIMO' : 'OK',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(dados)
  ws['!cols'] = [12, 30, 10, 25, 14, 14, 16, 18].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, 'Materiais')
  const nomeArq = obra?.nome
    ? `materiais_${obra.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    : `materiais_${new Date().toISOString().split('T')[0]}.xlsx`
  return salvar(wb, nomeArq)
}

module.exports = { exportarFuncionarios, exportarFinanceiro, exportarPonto, exportarMateriais }
