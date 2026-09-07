import { useState, useEffect, useMemo } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  TrendingUp,
  Clock,
  Download,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { exportFullReport } from '../utils/exportExcel';
import { classifyGroup } from '../utils/classifyGroup';
import EmptyState from '../components/EmptyState';

const Dashboard = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalTermos: 0,
    ativos: 0,
    devolvidos: 0,
    emConcerto: 0,
    totalEquipamentos: 0
  });
  
  const [recentMovements, setRecentMovements] = useState([]);
  const [chartDataGroup, setChartDataGroup] = useState([]);
  const [chartDataCollaborators, setChartDataCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);

  // Snapshot data kept in state for Excel export & alerts
  const [allTermos, setAllTermos] = useState([]);
  const [allEquipamentos, setAllEquipamentos] = useState([]);
  const [allColaboradores, setAllColaboradores] = useState([]);
  const [allOS, setAllOS] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // 1. Listen to Termos
    const qTermos = query(collection(db, COLLECTIONS.TERMOS));
    const unsubscribeTermos = onSnapshot(qTermos, (snapshot) => {
      let total = 0;
      let active = 0;
      let returned = 0;
      let repair = 0;
      
      const collabCounts = {};
      const groupCounts = {};
      const movements = [];
      const allList = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.status === 'ATIVO') active++;
        else if (data.status === 'DEVOLVIDO' || data.status === 'DEVOLVIDO AO FORNECEDOR') returned++;
        else if (data.status === 'EM CONCERTO') repair++;

        const termDate = data.dataEntrada?.toDate ? data.dataEntrada.toDate() : new Date(0);

        if (data.status === 'ATIVO') {
          const collab = data.colaboradorNome || 'Não Especificado';
          collabCounts[collab] = (collabCounts[collab] || 0) + (Number(data.quantidade) || 1);

          const group = data.grupo || classifyGroup(data.descricaoMaterial);
          groupCounts[group] = (groupCounts[group] || 0) + (Number(data.quantidade) || 1);
        }

        const itemObj = {
          id: doc.id,
          ...data,
          dateObj: termDate,
          retDateObj: data.dataDevolucao?.toDate ? data.dataDevolucao.toDate() : null
        };

        allList.push(itemObj);
        movements.push(itemObj);
      });

      movements.sort((a, b) => b.dateObj - a.dateObj);
      setRecentMovements(movements.slice(0, 6));
      setAllTermos(allList);

      const topCollabs = Object.entries(collabCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setChartDataCollaborators(topCollabs);

      const groupStats = Object.entries(groupCounts)
        .map(([name, value]) => ({ name, value }));
      setChartDataGroup(groupStats);

      setStats(prev => ({
        ...prev,
        totalTermos: total,
        ativos: active,
        devolvidos: returned,
        emConcerto: repair
      }));
      setLoading(false);
    });

    // 2. Listen to Equipamentos Catalog
    const qEq = query(collection(db, COLLECTIONS.EQUIPAMENTOS));
    const unsubscribeEq = onSnapshot(qEq, (snapshot) => {
      const eqList = [];
      snapshot.forEach(doc => eqList.push({ id: doc.id, ...doc.data() }));
      setAllEquipamentos(eqList);
      setStats(prev => ({
        ...prev,
        totalEquipamentos: snapshot.size
      }));
    });

    // 3. Listen to Colaboradores
    const unsubscribeCollabs = onSnapshot(collection(db, COLLECTIONS.COLABORADORES), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setAllColaboradores(list);
    });

    // 4. Listen to OS / Consertos
    const unsubscribeOS = onSnapshot(collection(db, COLLECTIONS.OS_CONSERTO), (snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data,
          dateOSObj: data.dataOS?.toDate ? data.dataOS.toDate() : null,
          dateEnvioObj: data.dataEnvio?.toDate ? data.dataEnvio.toDate() : null,
          dateRetornoObj: data.dataRetorno?.toDate ? data.dataRetorno.toDate() : null,
        });
      });
      setAllOS(list);
    });

    return () => {
      unsubscribeTermos();
      unsubscribeEq();
      unsubscribeCollabs();
      unsubscribeOS();
    };
  }, []);

  // Compute Automated Alerts for Critical Items
  const alerts = useMemo(() => {
    const now = new Date();
    const delayedOS = [];
    const prolongedTerms = [];

    // 1. Check Delayed Repairs (> 15 / > 30 days)
    allOS.forEach(os => {
      const statusNorm = (os.status || '').toLowerCase().trim();
      const isPending = statusNorm === 'enviado' || statusNorm === 'em conserto' || (!os.dataRetorno && statusNorm !== 'retornado');
      if (isPending && os.dateEnvioObj) {
        const diffDays = Math.floor((now - os.dateEnvioObj) / (1000 * 60 * 60 * 24));
        if (diffDays >= 15) {
          delayedOS.push({ ...os, diffDays });
        }
      }
    });

    // 2. Check Prolonged Active Terms (> 45 days)
    allTermos.forEach(t => {
      if (t.status === 'ATIVO' && t.dateObj && t.dateObj.getTime() > 0) {
        const diffDays = Math.floor((now - t.dateObj) / (1000 * 60 * 60 * 24));
        if (diffDays >= 45) {
          prolongedTerms.push({ ...t, diffDays });
        }
      }
    });

    delayedOS.sort((a, b) => b.diffDays - a.diffDays);
    prolongedTerms.sort((a, b) => b.diffDays - a.diffDays);

    return {
      delayedOS,
      prolongedTerms,
      hasAlerts: delayedOS.length > 0 || prolongedTerms.length > 0
    };
  }, [allOS, allTermos]);

  const COLORS = ['#3b82f6', '#eab308', '#10b981', '#a855f7', '#f97316', '#06b6d4'];

  const handleExport = () => {
    setExporting(true);
    try {
      exportFullReport({
        termos: allTermos,
        equipamentos: allEquipamentos,
        colaboradores: allColaboradores,
        osList: allOS,
      });
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      toast.error('Erro ao gerar relatório Excel: ' + err.message);
    } finally {
      setTimeout(() => setExporting(false), 1200);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)' }}>Carregando estatísticas...</h3>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-primary-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Visão Geral da Obra
          </span>
          <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginTop: '2px' }}>Dashboard</h1>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="btn btn-accent"
          style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (exporting || loading) ? 0.7 : 1 }}
          title="Exportar relatório completo em Excel (.xlsx)"
        >
          <Download size={18} />
          {exporting ? 'Gerando Excel...' : 'Exportar Relatório Excel'}
        </button>
      </div>

      {/* Automated Alerts Banner */}
      {alerts.hasAlerts && (
        <div style={{
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px'
        }}>
          {alerts.delayedOS.length > 0 && (
            <div 
              onClick={() => navigate('/consertos')}
              className="glass-panel pulse-warning"
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-warning)',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {alerts.delayedOS.length} Conserto{alerts.delayedOS.length > 1 ? 's' : ''} em Atraso (+15 dias)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Maior tempo: {alerts.delayedOS[0].diffDays} dias em manutenção. Clique para ver.
                  </div>
                </div>
              </div>
              <ArrowUpRight size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            </div>
          )}

          {alerts.prolongedTerms.length > 0 && (
            <div 
              onClick={() => navigate('/termos')}
              className="glass-panel pulse-urgent"
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary-light)',
                  flexShrink: 0
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {alerts.prolongedTerms.length} Cautela{alerts.prolongedTerms.length > 1 ? 's' : ''} Prolongada{alerts.prolongedTerms.length > 1 ? 's' : ''} (+45 dias)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Itens em posse prolongada. Clique para auditar.
                  </div>
                </div>
              </div>
              <ArrowUpRight size={18} style={{ color: 'var(--color-primary-light)', flexShrink: 0 }} />
            </div>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="dashboard-grid">
        <div className="glass-panel card-stat stagger-1">
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Termos Ativos</span>
            <h2 style={{ fontSize: '1.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>{stats.ativos}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.18)', color: 'var(--color-success)' }}>
            <FileText size={22} />
          </div>
        </div>

        <div className="glass-panel card-stat stagger-2">
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Itens Devolvidos</span>
            <h2 style={{ fontSize: '1.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>{stats.devolvidos}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(71, 85, 105, 0.18)', color: 'var(--text-secondary)' }}>
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="glass-panel card-stat stagger-3">
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Em Conserto</span>
            <h2 style={{ fontSize: '1.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>{stats.emConcerto}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="glass-panel card-stat stagger-4">
          <div>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Catálogo de Itens</span>
            <h2 style={{ fontSize: '1.85rem', marginTop: '6px', color: 'var(--text-primary)' }}>{stats.totalEquipamentos}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.18)', color: 'var(--color-primary-light)' }}>
            <Wrench size={22} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Top Collaborators Bar Chart */}
        <div className="glass-panel" style={{ padding: '20px', minWidth: 0 }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> Top 5 Colaboradores (Ferramentas Ativas)
          </h3>
          <div style={{ width: '100%', height: '280px', minWidth: 0 }}>
            {chartDataCollaborators.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                <BarChart data={chartDataCollaborators} layout="vertical" margin={{ left: 40, right: 16 }}>
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={110} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-app)', 
                      borderColor: 'var(--border-card)', 
                      borderRadius: '8px', 
                      color: 'var(--text-primary)' 
                    }} 
                  />
                  <Bar dataKey="count" fill="var(--color-primary-light)" radius={[0, 4, 4, 0]} barSize={16}>
                    {chartDataCollaborators.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Nenhuma ferramenta ativa no momento.
              </div>
            )}
          </div>
        </div>

        {/* Group Distribution Pie Chart */}
        <div className="glass-panel" style={{ padding: '20px', minWidth: 0 }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Distribuição por Categoria
          </h3>
          <div style={{ width: '100%', height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
            {chartDataGroup.length > 0 ? (
              <>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={100}>
                    <PieChart>
                      <Pie
                        data={chartDataGroup}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartDataGroup.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-app)', 
                          borderColor: 'var(--border-card)', 
                          borderRadius: '8px', 
                          color: 'var(--text-primary)' 
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', width: '100%', maxHeight: '75px', overflowY: 'auto' }}>
                  {chartDataGroup.map((entry, index) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Nenhum dado disponível.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} /> Últimas Movimentações
        </h3>
        
        {recentMovements.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Colaborador</th>
                  <th>Equipamento / Material</th>
                  <th>TAG / Código</th>
                  <th>Qtd.</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td>{mov.dateObj ? mov.dateObj.toLocaleDateString('pt-BR') : '-'}</td>
                    <td style={{ fontWeight: 600 }}>{mov.colaboradorNome}</td>
                    <td>{mov.descricaoMaterial}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                        {mov.tag || mov.codEquipamento || '-'}
                      </span>
                    </td>
                    <td>{mov.quantidade}</td>
                    <td>
                      <span className={`badge ${
                        mov.status === 'ATIVO' ? 'badge-active' : 
                        mov.status === 'DEVOLVIDO' ? 'badge-returned' : 
                        mov.status === 'DEVOLVIDO AO FORNECEDOR' ? 'badge-supplier' : 
                        'badge-repair'
                      }`}>
                        {mov.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            compact 
            title="Nenhuma movimentação registrada" 
            description="As movimentações e cautelas geradas aparecerão aqui automaticamente." 
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
