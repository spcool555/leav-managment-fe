import React from 'react';

const PALETTES = [
  {
    headerBg: 'bg-purple-100 border-purple-200',
    headerText: 'text-purple-950',
    barBg: 'bg-purple-500',
    barBgLight: 'bg-purple-200',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  {
    headerBg: 'bg-pink-100 border-pink-200',
    headerText: 'text-pink-950',
    barBg: 'bg-pink-500',
    barBgLight: 'bg-pink-200',
    text: 'text-pink-700',
    border: 'border-pink-200'
  },
  {
    headerBg: 'bg-emerald-100 border-emerald-200',
    headerText: 'text-emerald-950',
    barBg: 'bg-emerald-500',
    barBgLight: 'bg-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-200'
  },
  {
    headerBg: 'bg-amber-100 border-amber-200',
    headerText: 'text-amber-950',
    barBg: 'bg-amber-500',
    barBgLight: 'bg-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  {
    headerBg: 'bg-sky-100 border-sky-200',
    headerText: 'text-sky-950',
    barBg: 'bg-sky-500',
    barBgLight: 'bg-sky-200',
    text: 'text-sky-700',
    border: 'border-sky-200'
  },
  {
    headerBg: 'bg-indigo-100 border-indigo-200',
    headerText: 'text-indigo-950',
    barBg: 'bg-indigo-500',
    barBgLight: 'bg-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  {
    headerBg: 'bg-teal-100 border-teal-200',
    headerText: 'text-teal-950',
    barBg: 'bg-teal-500',
    barBgLight: 'bg-teal-200',
    text: 'text-teal-700',
    border: 'border-teal-200'
  }
];

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const t = dateStr.split(/[- :T]/);
  if (t.length >= 3) {
    const year = parseInt(t[0], 10);
    const month = parseInt(t[1], 10) - 1;
    const day = parseInt(t[2], 10);
    const hour = t[3] ? parseInt(t[3], 10) : 0;
    const min = t[4] ? parseInt(t[4], 10) : 0;
    const sec = t[5] ? parseInt(t[5], 10) : 0;
    return new Date(year, month, day, hour, min, sec);
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (date) => {
  if (!date) return '—';
  const d = parseDate(date);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  });
};

const GanttChart = ({ junctions = [] }) => {
  if (!junctions || junctions.length === 0) {
    return (
      <div className="bg-white border border-[#dcebe3] rounded-2xl p-8 text-center text-gray-500 shadow-sm mb-6">
        <p className="text-base font-medium">No junction visits recorded for the selected timeline.</p>
        <p className="text-xs text-gray-400 mt-1">Please try changing the date filters or selecting a team with active visits.</p>
      </div>
    );
  }

  // Parse all start and end dates
  const visits = junctions.map(j => {
    const start = parseDate(j.started_at) || parseDate(j.date) || new Date();
    const end = j.completed_at ? parseDate(j.completed_at) : new Date();
    return {
      ...j,
      startDate: start,
      endDate: end
    };
  });

  // Find min and max dates
  let minDate = new Date(Math.min(...visits.map(v => v.startDate)));
  let maxDate = new Date(Math.max(...visits.map(v => v.endDate)));

  // Align minDate to the start of its week (Monday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  minDate = getStartOfWeek(minDate);

  // Calculate day difference
  const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  
  // Ensure we show at least 14 days, and align to week boundary (Sunday)
  if (diffDays < 14) {
    maxDate = new Date(minDate);
    maxDate.setDate(minDate.getDate() + 13);
  } else {
    const getEndOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() + (day === 0 ? 0 : 7 - day);
      return new Date(d.setDate(diff));
    };
    maxDate = getEndOfWeek(maxDate);
  }

  // Generate list of days
  const days = [];
  let curr = new Date(minDate);
  while (curr <= maxDate) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // Group days by week
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    weeks.push({
      label: weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      length: weekDays.length
    });
  }

  // Group visits by Employee
  const groups = {};
  visits.forEach(v => {
    if (!groups[v.employee_id]) {
      groups[v.employee_id] = {
        employeeId: v.employee_id,
        employeeName: v.employee_name,
        visits: []
      };
    }
    groups[v.employee_id].visits.push(v);
  });
  const employeeGroups = Object.values(groups);

  // Helper to check if day falls in visit range
  const isDayInVisitRange = (day, visit) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const s = new Date(visit.startDate.getFullYear(), visit.startDate.getMonth(), visit.startDate.getDate());
    const e = new Date(visit.endDate.getFullYear(), visit.endDate.getMonth(), visit.endDate.getDate());
    return d >= s && d <= e;
  };

  const getDayInitial = (day) => {
    const initials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return initials[day.getDay()];
  };

  return (
    <div className="bg-white border border-[#dcebe3] rounded-2xl p-6 shadow-sm overflow-hidden mb-6">
      
      {/* Title Header resembling the excel template */}
      <div className="border-b border-gray-200 pb-4 mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-800 tracking-tight">SIMPLE GANTT CHART</h3>
          <p className="text-xs text-gray-500">Junction Visits Schedule & Progress Logs</p>
        </div>
        <div className="flex gap-4 text-xs font-semibold text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-500 rounded-sm inline-block"></span>
            <span>Completed (100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-blue-200 rounded-sm inline-block"></span>
            <span>In Progress (50%)</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart Table Container */}
      <div className="overflow-x-auto relative rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <thead>
            {/* Week Headers */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 text-left font-semibold text-gray-700 px-4 py-2 border-r border-gray-200 min-w-[200px]" style={{ left: 0 }}>TASK</th>
              <th className="sticky z-20 bg-gray-50 text-left font-semibold text-gray-700 px-3 py-2 border-r border-gray-200 min-w-[120px]" style={{ left: 200 }}>ASSIGNED TO</th>
              <th className="sticky z-20 bg-gray-50 text-center font-semibold text-gray-700 px-2 py-2 border-r border-gray-200 min-w-[70px]" style={{ left: 320 }}>PROGRESS</th>
              <th className="sticky z-20 bg-gray-50 text-center font-semibold text-gray-700 px-2 py-2 border-r border-gray-200 min-w-[80px]" style={{ left: 390 }}>START</th>
              <th className="sticky z-20 bg-gray-50 text-center font-semibold text-gray-700 px-2 py-2 border-r-2 border-gray-300 min-w-[80px]" style={{ left: 470 }}>END</th>
              
              {/* Calendar Weeks */}
              {weeks.map((week, idx) => (
                <th 
                  key={idx} 
                  colSpan={week.length} 
                  className="text-center font-semibold text-gray-600 px-1 py-1.5 border-r border-gray-200 uppercase text-[10px] tracking-wider bg-gray-100"
                >
                  {week.label}
                </th>
              ))}
            </tr>

            {/* Days & Initials Row */}
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-2 border-r border-gray-200 text-left text-gray-400 font-normal" style={{ left: 0 }}></th>
              <th className="sticky z-20 bg-gray-50 px-3 py-2 border-r border-gray-200 text-left text-gray-400 font-normal" style={{ left: 200 }}></th>
              <th className="sticky z-20 bg-gray-50 px-2 py-2 border-r border-gray-200 text-center text-gray-400 font-normal" style={{ left: 320 }}></th>
              <th className="sticky z-20 bg-gray-50 px-2 py-2 border-r border-gray-200 text-center text-gray-400 font-normal" style={{ left: 390 }}></th>
              <th className="sticky z-20 bg-gray-50 px-2 py-2 border-r-2 border-gray-300 text-center text-gray-400 font-normal" style={{ left: 470 }}></th>
              
              {/* Day numbers */}
              {days.map((day, idx) => (
                <th key={idx} className="w-8 min-w-[32px] text-center font-bold text-gray-700 py-1 border-r border-gray-100">
                  <div className="text-[10px]">{day.getDate()}</div>
                  <div className="text-[9px] font-normal text-gray-400">{getDayInitial(day)}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {employeeGroups.map((group, groupIdx) => {
              const theme = PALETTES[groupIdx % PALETTES.length];

              return (
                <React.Fragment key={group.employeeId}>
                  {/* Category Header Row (Employee Header) */}
                  <tr className={`border-b ${theme.border}`}>
                    <td 
                      className={`sticky left-0 z-10 px-4 py-2.5 font-bold uppercase tracking-wider ${theme.headerBg} ${theme.headerText} border-r border-gray-200`} 
                      style={{ left: 0 }}
                    >
                      {group.employeeName} ({group.employeeId})
                    </td>
                    <td className={`sticky z-10 ${theme.headerBg} border-r border-gray-200`} style={{ left: 200 }}></td>
                    <td className={`sticky z-10 ${theme.headerBg} border-r border-gray-200`} style={{ left: 320 }}></td>
                    <td className={`sticky z-10 ${theme.headerBg} border-r border-gray-200`} style={{ left: 390 }}></td>
                    <td className={`sticky z-10 ${theme.headerBg} border-r-2 border-gray-300`} style={{ left: 470 }}></td>
                    
                    {/* Empty cells for timeline in the header row */}
                    {days.map((_, idx) => (
                      <td key={idx} className={`border-r border-gray-100 ${theme.headerBg} opacity-30`}></td>
                    ))}
                  </tr>

                  {/* Task Rows (Visits) */}
                  {group.visits.map((visit, visitIdx) => {
                    const isCompleted = visit.status === 'completed';
                    const progressStr = isCompleted ? '100%' : '50%';
                    const progressColor = isCompleted ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white';

                    return (
                      <tr key={visit.id} className="hover:bg-gray-50 border-b border-gray-200">
                        {/* Task Column */}
                        <td 
                          className="sticky left-0 z-10 bg-white hover:bg-gray-50 font-medium text-gray-800 px-4 py-2 border-r border-gray-200 pl-8 truncate max-w-[200px]" 
                          style={{ left: 0 }}
                          title={visit.junction_name}
                        >
                          {visit.junction_name}
                        </td>
                        
                        {/* Assigned To Column */}
                        <td 
                          className="sticky z-10 bg-white hover:bg-gray-50 text-gray-600 px-3 py-2 border-r border-gray-200 truncate max-w-[120px]" 
                          style={{ left: 200 }}
                        >
                          {group.employeeName}
                        </td>
                        
                        {/* Progress Column */}
                        <td 
                          className="sticky z-10 bg-white hover:bg-gray-50 px-2 py-2 border-r border-gray-200 text-center" 
                          style={{ left: 320 }}
                        >
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${progressColor}`}>
                            {progressStr}
                          </span>
                        </td>
                        
                        {/* Start Date Column */}
                        <td 
                          className="sticky z-10 bg-white hover:bg-gray-50 text-gray-600 px-2 py-2 border-r border-gray-200 text-center whitespace-nowrap" 
                          style={{ left: 390 }}
                        >
                          {formatDate(visit.startDate)}
                        </td>
                        
                        {/* End Date Column */}
                        <td 
                          className="sticky z-10 bg-white hover:bg-gray-50 text-gray-600 px-2 py-2 border-r-2 border-gray-300 text-center whitespace-nowrap" 
                          style={{ left: 470 }}
                        >
                          {isCompleted ? formatDate(visit.endDate) : 'Ongoing'}
                        </td>

                        {/* Calendar cells for this visit */}
                        {days.map((day, dayIdx) => {
                          const isActive = isDayInVisitRange(day, visit);
                          let cellClass = 'border-r border-gray-100';
                          if (isActive) {
                            cellClass += ` ${isCompleted ? theme.barBg : theme.barBgLight}`;
                          }

                          return (
                            <td 
                              key={dayIdx} 
                              className={`w-8 min-w-[32px] ${cellClass} transition-colors relative group`}
                            >
                              {isActive && (
                                <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 bg-black/10 flex items-center justify-center cursor-default">
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-30 bg-gray-900 text-white rounded p-2 shadow-lg hidden group-hover:block w-48 text-[11px] font-normal leading-normal whitespace-normal">
                                    <strong className="block mb-1">{visit.junction_name}</strong>
                                    <div><strong>Type:</strong> {visit.visit_type || 'Regular Visit'}</div>
                                    <div><strong>Status:</strong> {visit.status}</div>
                                    <div><strong>Start:</strong> {visit.startDate.toLocaleDateString()}</div>
                                    <div><strong>End:</strong> {isCompleted ? visit.endDate.toLocaleDateString() : 'Ongoing'}</div>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GanttChart;
