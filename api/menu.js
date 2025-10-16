// /api/menu.js — Sidebar менюнүүд
export default function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const mk = (id, label) => ({
    id, label,
    items: [
      { id: 'intro',        label: 'Танилцуулга' },
      { id: 'course',       label: 'Сургалт' },
      { id: 'practice',     label: 'Дасгал' },
      { id: 'assessment',   label: 'Шалгалт' },
      { id: 'report',       label: 'Тайлан' },
    ]
  });

  res.status(200).json({
    ok: true,
    menu: [
      mk('psychology',   'Сэтгэлзүй'),
      mk('health',       'Эрүүл мэнд'),
      mk('finance',      'Санхүү'),
      mk('goals',        'Зорилго'),
      mk('relationship', 'Харилцаа'),
      mk('environment',  'Орчин'),
      mk('reminders',    'Сануулга'),
      mk('journal',      'Тэмдэглэл'),
    ]
  });
}
