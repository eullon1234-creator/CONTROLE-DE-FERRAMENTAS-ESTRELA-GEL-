import React, { useState, useEffect, useRef } from 'react';
import { Filter, ArrowUp, ArrowDown, Search, X, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

const ColumnFilterPopover = ({
  title,
  columnKey,
  uniqueValues = [],
  selectedValues = [], // array of checked items (empty means all selected)
  onSelectChange,
  conditionFilter = { type: '', value: '' }, // condition: { type, value }
  onConditionFilterChange,
  onSortChange,
  currentSort = null, // 'asc' | 'desc' | null
  isDate = false,
  align = 'right',
  isNumeric = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isConditionExpanded, setIsConditionExpanded] = useState(false);
  const popoverRef = useRef(null);

  // Buffered temporary states for Excel-like OK confirmation
  const [tempSelectedValues, setTempSelectedValues] = useState(selectedValues);
  const [tempConditionFilter, setTempConditionFilter] = useState(conditionFilter);

  // Sync temporary state with props whenever popover opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedValues(selectedValues);
      setTempConditionFilter(conditionFilter || { type: '', value: '' });
      setSearchValue('');
      // Expand condition section if a condition is already active
      if (conditionFilter && conditionFilter.type) {
        setIsConditionExpanded(true);
      }
    }
  }, [isOpen, selectedValues, conditionFilter]);

  // Toggle popover visibility
  const togglePopover = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Close popover when clicking outside (discarding unapplied changes)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine if this specific column has active filters (checklist or condition)
  const hasActiveFilter = selectedValues.length > 0 || (conditionFilter && conditionFilter.type);

  // Filter unique values by search input
  const filteredValues = uniqueValues.filter(val => {
    const valStr = val === null || val === undefined ? '-' : String(val);
    return valStr.toLowerCase().includes(searchValue.toLowerCase());
  });

  const handleSelectAllChange = (e) => {
    const isChecked = e.target.checked;
    const filteredStrs = filteredValues.map(v => v === null || v === undefined ? '-' : String(v));

    if (searchValue.trim() === '') {
      if (isChecked) {
        setTempSelectedValues([]); // clear filter = show all
      } else {
        setTempSelectedValues(['__NONE_SELECTED__']);
      }
    } else {
      // Search is active, apply checklist change ONLY to filtered values
      let newSelected = [...tempSelectedValues];
      if (newSelected.includes('__NONE_SELECTED__')) {
        newSelected = [];
      }

      if (isChecked) {
        // Check only the filtered search items
        filteredStrs.forEach(str => {
          if (!newSelected.includes(str)) {
            newSelected.push(str);
          }
        });
      } else {
        // Uncheck only the filtered search items
        newSelected = newSelected.filter(item => !filteredStrs.includes(item));
      }

      if (newSelected.length === 0) {
        newSelected = ['__NONE_SELECTED__'];
      }

      const allUniqueStrs = uniqueValues.map(v => v === null || v === undefined ? '-' : String(v));
      const hasAll = allUniqueStrs.every(v => newSelected.includes(v));
      if (hasAll) {
        setTempSelectedValues([]);
      } else {
        setTempSelectedValues(newSelected);
      }
    }
  };

  const handleCheckboxChange = (val) => {
    const valStr = val === null || val === undefined ? '-' : String(val);
    let newSelected = [...tempSelectedValues];
    
    if (newSelected.includes('__NONE_SELECTED__')) {
      newSelected = [];
    }

    if (newSelected.includes(valStr)) {
      newSelected = newSelected.filter(item => item !== valStr);
      if (newSelected.length === 0) {
        newSelected = ['__NONE_SELECTED__'];
      }
    } else {
      newSelected.push(valStr);
    }

    const allUniqueStrs = uniqueValues.map(v => v === null || v === undefined ? '-' : String(v));
    const hasAll = allUniqueStrs.every(v => newSelected.includes(v));
    if (hasAll) {
      setTempSelectedValues([]);
    } else {
      setTempSelectedValues(newSelected);
    }
  };

  const handleClearFilter = () => {
    onSelectChange([]);
    if (onConditionFilterChange) {
      onConditionFilterChange({ type: '', value: '' });
    }
    setTempSelectedValues([]);
    setTempConditionFilter({ type: '', value: '' });
    setIsOpen(false);
  };

  // Apply all filters on OK click
  const handleApplyFilters = () => {
    onSelectChange(tempSelectedValues);
    if (onConditionFilterChange) {
      onConditionFilterChange(tempConditionFilter);
    }
    setIsOpen(false);
  };

  const handleSort = (direction) => {
    onSortChange(direction);
    setIsOpen(false);
  };

  const isAllSelected = tempSelectedValues.length === 0;

  // Render the list of conditions
  const renderConditionFilter = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        <select
          value={tempConditionFilter?.type || ''}
          onChange={(e) => {
            const type = e.target.value;
            setTempConditionFilter({
              type,
              value: type === 'empty' || type === 'not_empty' ? '' : (tempConditionFilter?.value || '')
            });
          }}
          className="form-input"
          style={{
            fontSize: '0.75rem',
            padding: '6px 8px',
            backgroundColor: 'var(--bg-app)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-card)',
            borderRadius: '4px',
            height: 'auto',
            width: '100%',
            cursor: 'pointer'
          }}
        >
          <option value="">(Sem condição)</option>
          {isNumeric ? (
            <>
              <option value="num_equals">Igual a...</option>
              <option value="num_not_equals">Diferente de...</option>
              <option value="gt">Maior que...</option>
              <option value="gte">Maior ou igual a...</option>
              <option value="lt">Menor que...</option>
              <option value="lte">Menor ou igual a...</option>
            </>
          ) : (
            <>
              <option value="contains">Contém...</option>
              <option value="not_contains">Não contém...</option>
              <option value="starts_with">Começa com...</option>
              <option value="ends_with">Termina com...</option>
              <option value="equals">Igual a...</option>
              <option value="empty">Está vazio</option>
              <option value="not_empty">Não está vazio</option>
            </>
          )}
        </select>

        {tempConditionFilter?.type && tempConditionFilter.type !== 'empty' && tempConditionFilter.type !== 'not_empty' && (
          <input
            type={isNumeric ? "number" : "text"}
            placeholder={isNumeric ? "Digite o número..." : "Digite o texto..."}
            value={tempConditionFilter?.value || ''}
            onChange={(e) => setTempConditionFilter({ type: tempConditionFilter.type, value: e.target.value })}
            className="form-input"
            style={{
              fontSize: '0.75rem',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-card)',
              borderRadius: '4px',
              height: 'auto',
              width: '100%'
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div ref={popoverRef} style={{ display: 'inline-block', position: 'relative', marginLeft: '6px', verticalAlign: 'middle' }} className="no-print">
      {/* Filter trigger button */}
      <button
        type="button"
        onClick={togglePopover}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: hasActiveFilter || currentSort ? 'var(--color-primary-light)' : 'var(--text-muted)',
          backgroundColor: hasActiveFilter || currentSort ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
          boxShadow: hasActiveFilter ? '0 0 8px rgba(59, 130, 246, 0.25)' : 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title={`Filtrar/Ordenar ${title}`}
      >
        <Filter size={13} style={{ fill: hasActiveFilter ? 'var(--color-primary-light)' : 'none' }} />
        {currentSort === 'asc' && <ArrowUp size={10} style={{ marginLeft: '1px' }} />}
        {currentSort === 'desc' && <ArrowDown size={10} style={{ marginLeft: '1px' }} />}
      </button>

      {/* Popover Dropdown menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          ...(align === 'left' ? { left: 0 } : { right: 0 }),
          marginTop: '8px',
          width: '260px',
          backgroundColor: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-card)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          padding: '12px',
          textAlign: 'left',
          fontFamily: 'var(--font-body)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          animation: 'slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {/* Header */}
          <div style={{ fontWeight: 700, marginBottom: '10px', borderBottom: '1px solid var(--border-card)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>Filtro: {title}</span>
            <button type="button" onClick={() => setIsOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Sort Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={() => handleSort('asc')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 8px',
                border: 'none',
                background: currentSort === 'asc' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                borderRadius: '4px',
                color: currentSort === 'asc' ? 'var(--color-primary-light)' : 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: currentSort === 'asc' ? 600 : 400,
                fontSize: '0.78rem'
              }}
            >
              <ArrowUp size={13} />
              {isDate ? 'Ordenar do mais antigo' : 'Ordenar de A a Z'}
            </button>
            <button
              type="button"
              onClick={() => handleSort('desc')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 8px',
                border: 'none',
                background: currentSort === 'desc' ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                borderRadius: '4px',
                color: currentSort === 'desc' ? 'var(--color-primary-light)' : 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: currentSort === 'desc' ? 600 : 400,
                fontSize: '0.78rem'
              }}
            >
              <ArrowDown size={13} />
              {isDate ? 'Ordenar do mais novo' : 'Ordenar de Z a A'}
            </button>
          </div>

          <div style={{ borderBottom: '1px solid var(--border-card)', marginBottom: '8px' }}></div>

          {/* Advanced Condition Filter Section */}
          <div style={{ marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setIsConditionExpanded(!isConditionExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 8px',
                border: 'none',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '4px',
                color: tempConditionFilter?.type ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={11} /> 
                {isNumeric ? 'Filtro de Número' : 'Filtro de Texto'} {tempConditionFilter?.type ? '●' : ''}
              </span>
              {isConditionExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {isConditionExpanded && (
              <div style={{
                marginTop: '6px',
                padding: '8px',
                backgroundColor: 'rgba(0,0,0,0.01)',
                border: '1px solid var(--border-card)',
                borderRadius: '4px'
              }}>
                {renderConditionFilter()}
              </div>
            )}
          </div>

          <div style={{ borderBottom: '1px solid var(--border-card)', marginBottom: '8px' }}></div>

          {/* Search box for checklist items */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Pesquisar itens..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 26px',
                fontSize: '0.75rem',
                borderRadius: '4px',
                border: '1px solid var(--border-card)',
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          {/* Checklist Container */}
          <div style={{
            maxHeight: '110px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '4px',
            border: '1px solid var(--border-card)',
            borderRadius: '4px',
            marginBottom: '10px',
            backgroundColor: 'rgba(0,0,0,0.01)'
          }}>
            {/* Select All Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 4px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAllChange}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.75rem' }}>
                {searchValue.trim() !== '' ? '(Selecionar filtrados)' : '(Selecionar Tudo)'}
              </span>
            </label>

            {filteredValues.map((val, idx) => {
              const valStr = val === null || val === undefined ? '-' : String(val);
              const isChecked = tempSelectedValues.includes(valStr) && !tempSelectedValues.includes('__NONE_SELECTED__');
              return (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleCheckboxChange(val)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '190px'
                  }} title={valStr}>
                    {valStr}
                  </span>
                </label>
              );
            })}

            {filteredValues.length === 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                Nenhum valor encontrado
              </span>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleClearFilter}
              disabled={!hasActiveFilter}
              style={{
                background: 'none',
                border: 'none',
                color: hasActiveFilter ? 'var(--color-danger)' : 'var(--text-muted)',
                cursor: hasActiveFilter ? 'pointer' : 'default',
                fontSize: '0.74rem',
                fontWeight: 600,
                textDecoration: hasActiveFilter ? 'underline' : 'none'
              }}
            >
              Limpar Filtro
            </button>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="btn btn-primary"
              style={{
                padding: '4px 12px',
                fontSize: '0.74rem',
                borderRadius: '4px'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnFilterPopover;
