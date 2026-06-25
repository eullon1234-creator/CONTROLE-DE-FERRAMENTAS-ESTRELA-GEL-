import React, { useState, useEffect } from 'react';
import { db, COLLECTIONS } from '../firebase/config';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Wrench, 
  TrendingUp,
  Clock,
  Download
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
import { exportFullReport } from '../utils/exportExcel';

// Fallback classifier for records that don't have a saved 'grupo' field
const classifyGroup = (desc) => {
  const d = String(desc || '').toLowerCase();
  if (d.includes('bateria') || d.includes('carregador')) return 'Bateria / Acessório';
  if (d.includes('pneumat') || d.includes('pneumá')) return 'Pneumática';
  if (d.includes('solde') || d.includes('solda') || d.includes('compressor') || d.includes('gerador') || d.includes('bomba')) return 'Máquina';
  if (d.includes('furadeira') || d.includes('lixadeira') || d.includes('esmerilhadeira') || d.includes('serra') || d.includes('martelete') || d.includes('soprador') || d.includes('parafusadeira') || d.includes('tupia') || d.includes('plaina') || d.includes('politriz') || d.includes('gsh') || d.includes('gsb')) return 'Elétrica';
  return 'Ferramenta Manual';
};

const Dashboard = () => {
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

  // Snapshot data kept in state for Excel export
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
        else if (data.status === 'DEVOLVIDO') returned++;
        else if (data.status === 'EM CONCERTO') repair++;

        // Count for graphs (only for active items)
        if (data.status === 'ATIVO') {
          // Collaborators
          const collab = data.colaboradorNome || 'Não Especificado';
          collabCounts[collab] = (collabCounts[collab] || 0) + (Number(data.quantidade) || 1);

          // Groups — BUG FIX: use classifyGroup as fallback for records without saved 'grupo'
          const group = data.grupo || classifyGroup(data.descricaoMaterial);
          groupCounts[group] = (groupCounts[group] || 0) + (Number(data.quantidade) || 1);
        }

        allList.push({
          id: doc.id,
          ...data,
          dateObj: data.dataEntrada?.toDate() || new Date(0),
          retDateObj: data.dataDevolucao?.toDate() || null
        });

        // Keep all for sorting recent movements
        movements.push({
          id: doc.id,
          ...data,
          dateObj: data.dataEntrada?.toDate() || new Date(0)
        });
      });

      // Sort and set recent movements (last 5)
      movements.sort((a, b) => b.dateObj - a.dateObj);
      setRecentMovements(movements.slice(0, 5));
      setAllTermos(allList);

      // Build Top Collaborators Chart Data
      const topCollabs = Object.entries(collabCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setChartDataCollaborators(topCollabs);

      // Build Groups Chart Data
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
          dateOSObj: data.dataOS?.toDate() || null,
          dateEnvioObj: data.dataEnvio?.toDate() || null,
          dateRetornoObj: data.dataRetorno?.toDate() || null,
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
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao gerar relatório: ' + err.message);
    } finally {
      setTimeout(() => setExporting(false), 1500);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)' }}>Carregando estatísticas...</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 40px 40px 320px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-light)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Visão Geral da Obra
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '4px' }}>Dashboard</h1>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="btn btn-accent"
          style={{ padding: '12px 24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (exporting || loading) ? 0.7 : 1 }}
          title="Exportar relatório completo em Excel (.xlsx)"
        >
          <Download size={18} />
          {exporting ? 'Gerando Excel...' : 'Exportar Relatório Excel'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="dashboard-grid">
        {/* Metric card 1 */}
        <div className="glass-panel card-stat">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Termos Ativos</span>
            <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--text-primary)' }}>{stats.ativos}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)' }}>
            <FileText size={24} />
          </div>
        </div>

        {/* Metric card 2 */}
        <div className="glass-panel card-stat">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Itens Devolvidos</span>
            <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--text-primary)' }}>{stats.devolvidos}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)', color: 'var(--text-secondary)' }}>
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Metric card 3 */}
        <div className="glass-panel card-stat">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Em Conserto</span>
            <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--text-primary)' }}>{stats.emConcerto}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--color-warning)' }}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Metric card 4 */}
        <div className="glass-panel card-stat">
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Catálogo de Itens</span>
            <h2 style={{ fontSize: '2rem', marginTop: '8px', color: 'var(--text-primary)' }}>{stats.totalEquipamentos}</h2>
          </div>
          <div className="card-stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--color-primary-light)' }}>
            <Wrench size={24} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Top Collaborators Bar Chart */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> Top 5 Colaboradores (Ferramentas Ativas)
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            {chartDataCollaborators.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataCollaborators} layout="vertical" margin={{ left: 50, right: 20 }}>
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={120} />
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
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-primary)' }}>
            Distribuição por Categoria
          </h3>
          <div style={{ width: '100%', height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {chartDataGroup.length > 0 ? (
              <>
                <div style={{ width: '100%', height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataGroup}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 15px', justifyContent: 'center', width: '100%', maxHeight: '80px', overflowY: 'auto' }}>
                  {chartDataGroup.map((entry, index) => (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
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
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <th>Tag / Código</th>
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
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            Nenhuma movimentação cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
