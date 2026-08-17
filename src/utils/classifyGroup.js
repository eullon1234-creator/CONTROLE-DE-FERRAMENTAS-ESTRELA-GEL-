/**
 * Classifies an equipment/tool into a category group based on its description.
 * Used across Dashboard, Termos, and Equipamentos pages.
 * @param {string} desc - The equipment description text
 * @returns {string} The category group name
 */
export const classifyGroup = (desc) => {
  const d = String(desc || '').toLowerCase();
  if (d.includes('bateria') || d.includes('carregador')) return 'Bateria / Acessório';
  if (d.includes('pneumat') || d.includes('pneumá')) return 'Pneumática';
  if (d.includes('solde') || d.includes('solda') || d.includes('compressor') || d.includes('gerador') || d.includes('bomba')) return 'Máquina';
  if (d.includes('furadeira') || d.includes('lixadeira') || d.includes('esmerilhadeira') || d.includes('serra') || d.includes('martelete') || d.includes('soprador') || d.includes('parafusadeira') || d.includes('tupia') || d.includes('plaina') || d.includes('politriz') || d.includes('gsh') || d.includes('gsb')) return 'Elétrica';
  return 'Ferramenta Manual';
};
