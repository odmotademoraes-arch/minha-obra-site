import { useApp } from '../store/AppContext'

export type Cargo =
  | 'dono'
  | 'engenheiro_chefe'
  | 'engenheiro'
  | 'tecnico'
  | 'rh'
  | 'visualizador'

// 'all' = acesso total  |  'own' = apenas os seus  |  'readonly' = só leitura  |  false = sem acesso
export type Nivel = 'all' | 'own' | 'readonly' | false

interface Permissoes {
  obras:         Nivel
  funcionarios:  Nivel
  financeiro:    Nivel
  sst:           Nivel
  ia:            Nivel
  configuracoes: Nivel
  somente_leitura: boolean
  isDono: boolean
}

const MAPA: Record<Cargo, Permissoes> = {
  dono: {
    obras: 'all', funcionarios: 'all', financeiro: 'all',
    sst: 'all', ia: 'all', configuracoes: 'all',
    somente_leitura: false, isDono: true,
  },
  engenheiro_chefe: {
    obras: 'all', funcionarios: 'all', financeiro: 'all',
    sst: 'all', ia: 'all', configuracoes: 'all',
    somente_leitura: false, isDono: false,
  },
  engenheiro: {
    obras: 'own', funcionarios: 'all', financeiro: 'own',
    sst: 'all', ia: 'all', configuracoes: false,
    somente_leitura: false, isDono: false,
  },
  tecnico: {
    obras: 'own', funcionarios: 'all', financeiro: false,
    sst: 'all', ia: 'all', configuracoes: false,
    somente_leitura: false, isDono: false,
  },
  rh: {
    obras: false, funcionarios: 'all', financeiro: false,
    sst: 'all', ia: false, configuracoes: false,
    somente_leitura: false, isDono: false,
  },
  visualizador: {
    obras: 'readonly', funcionarios: 'readonly', financeiro: 'readonly',
    sst: 'readonly', ia: false, configuracoes: false,
    somente_leitura: true, isDono: false,
  },
}

export function usePermissoes(): Permissoes {
  const { cargo } = useApp()
  const cargoResolvido = (cargo as Cargo) || 'dono'
  return MAPA[cargoResolvido] ?? MAPA['dono']
}

export function useTemAcesso(modulo: keyof Omit<Permissoes, 'somente_leitura' | 'isDono'>): boolean {
  const p = usePermissoes()
  return p[modulo] !== false
}

export const CARGO_LABELS: Record<string, string> = {
  dono: 'Dono',
  engenheiro_chefe: 'Engenheiro Chefe',
  engenheiro: 'Engenheiro',
  tecnico: 'Técnico de Segurança',
  rh: 'RH',
  visualizador: 'Visualizador',
}
