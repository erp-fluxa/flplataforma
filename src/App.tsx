import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useDb } from './context/DbContext';
import { Shell } from './components/layout/Shell';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Estoque } from './views/Estoque';
import { Configuracoes } from './views/Configuracoes';
import { Tarefas } from './views/Tarefas';
import { Compras } from './views/Compras';
import { Producao } from './views/Producao';
import { Vendas } from './views/Vendas';
import { Comercial } from './views/Comercial';
import { Cadastros } from './views/Cadastros';
import { Clientes } from './views/Clientes';
import { Fornecedores } from './views/Fornecedores';
import { Depositos } from './views/Depositos';
import { FichasTecnicas } from './views/FichasTecnicas';
import { CentrosTrabalho } from './views/CentrosTrabalho';
import { Lixeira } from './views/Lixeira';

export const App: React.FC = () => {
  const { user } = useAuth();
  const { loading } = useDb();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    return path && path !== '/login' ? path : '/';
  });

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Redirecionamento inteligente para a Página Inicial configurada pelo usuário
  useEffect(() => {
    if (user && user.preferences?.initialRoute && user.preferences.initialRoute !== '/') {
      const path = window.location.pathname;
      if (path === '/' || path === '' || path === '/login') {
        navigate(user.preferences.initialRoute);
      }
    }
  }, [user?.id, user?.preferences?.initialRoute]);

  // Se não estiver logado, exibe a tela de login
  if (!user) {
    return <Login />;
  }


  // Roteamento SPA unificado sem duplicações
  const renderContent = () => {
    switch (currentPath) {
      case '/':
        return <Dashboard onNavigate={navigate} />;
      case '/estoque':
        return <Estoque />;
      case '/config':
        return <Configuracoes />;
      case '/tarefas':
        return <Tarefas />;
      case '/compras':
        return <Compras defaultTab="cotacoes" />;
      case '/cotacoes':
        return <Compras defaultTab="cotacoes" />;
      case '/pedidos':
        return <Compras defaultTab="pedidos" />;
      case '/producao':
        return <Producao defaultTab="visao_geral" />;
      case '/centros-trabalho':
        return <Cadastros defaultTab="centros" />;
      case '/fichas':
        return <Cadastros defaultTab="fichas" />;
      case '/cadastros':
        return <Cadastros defaultTab="clientes" />;
      case '/clientes':
        return <Cadastros defaultTab="clientes" />;
      case '/fornecedores':
        return <Cadastros defaultTab="fornecedores" />;
      case '/produtos':
        return <Cadastros defaultTab="produtos" />;
      case '/depositos':
        return <Cadastros defaultTab="depositos" />;
      case '/comercial':
        return <Comercial defaultTab="crm" />;
      case '/crm':
        return <Comercial defaultTab="crm" />;
      case '/vendas':
        return <Comercial defaultTab="vendas" />;
      case '/lixeira':
        return <Lixeira />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPath) {
      case '/': return 'Painel Geral & Indicadores';
      case '/estoque': return 'Gestão de Estoque & Saldos Físicos';
      case '/config': return 'Configurações do Sistema & Identidade Visual';
      case '/lixeira': return 'Lixeira & Itens Excluídos Recentemente';
      case '/tarefas': return 'Tarefas & Lista de Compras';
      case '/compras': return 'Gestão de Compras & Suprimentos';
      case '/cotacoes': return 'Cotações de Preço & RFQ';
      case '/pedidos': return 'Ordens de Compra de Suprimentos';
      case '/producao': return 'PCP & Produção Industrial';
      case '/centros-trabalho': return 'Centros de Trabalho & Postos Operacionais';
      case '/fichas': return 'Engenharia de Produto & Fichas Técnicas (BOM)';
      case '/cadastros': return 'Central de Cadastros Gerais';
      case '/clientes': return 'Cadastro de Clientes';
      case '/fornecedores': return 'Cadastro de Fornecedores Homologados';
      case '/produtos': return 'Catálogo de Produtos & Insumos';
      case '/depositos': return 'Depósitos & Almoxarifados Físicos';
      case '/comercial': return 'CRM & Gestão Comercial de Vendas';
      case '/crm': return 'CRM & Funil de Prospecção';
      case '/vendas': return 'Vendas & Pedidos de Venda';
      default: return 'Painel de Controle';
    }
  };

  return (
    <Shell currentPath={currentPath} onNavigate={navigate} title={getPageTitle()}>
      {renderContent()}
    </Shell>
  );
};
