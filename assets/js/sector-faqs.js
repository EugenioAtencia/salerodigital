function parseSectorFaqs(v){
  if(!v)return [];

  if(Array.isArray(v)){
    return v.map(item=>{
      if(typeof item==='string')return parseSectorFaqs(item)[0]||null;
      if(!item||typeof item!=='object')return null;
      const q=item.pregunta||item.faq_pregunta||item.question||item.titulo||item.title||item.nombre||item.label||'';
      const a=item.respuesta||item.faq_respuesta||item.answer||item.texto||item.content||item.descripcion||item.description||'';
      return q?{q:stripHtml(String(q)).trim(),a:String(a||'').trim()}:null;
    }).filter(Boolean);
  }

  if(typeof v==='object'){
    const q=v.pregunta||v.faq_pregunta||v.question||v.titulo||v.title||'';
    const a=v.respuesta||v.faq_respuesta||v.answer||v.texto||v.content||'';
    return q?[{q:stripHtml(String(q)).trim(),a:String(a||'').trim()}]:[];
  }

  const t=String(v||'').trim();
  if(!t)return [];

  const blocks=t.split(/(?=###\s)/).map(b=>b.trim()).filter(Boolean);
  if(blocks.length>1||t.startsWith('###')){
    return blocks.map(b=>{
      const lines=b.split(/\n+/).map(l=>l.trim()).filter(Boolean);
      const q=(lines.shift()||'').replace(/^###\s*/,'').trim();
      return q?{q,a:lines.join('\n\n')}:null;
    }).filter(Boolean);
  }

  const pipeRows=t.split(/\n+/).map(x=>x.trim()).filter(Boolean).filter(x=>x.includes('|'));
  if(pipeRows.length){
    return pipeRows.map(row=>{
      const parts=row.split('|');
      const q=(parts.shift()||'').trim();
      const a=parts.join('|').trim();
      return q?{q,a}:null;
    }).filter(Boolean);
  }

  const paragraphs=t.split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
  const faqs=[];
  let current=null;

  paragraphs.forEach(paragraph=>{
    const clean=stripHtml(paragraph).trim();
    const looksQuestion=/^¿/.test(clean)||/\?$/.test(clean)||/^pregunta\s*[:.-]/i.test(clean)||/^p\s*[:.-]/i.test(clean);
    if(looksQuestion){
      if(current)faqs.push(current);
      current={q:clean.replace(/^pregunta\s*[:.-]\s*/i,'').replace(/^p\s*[:.-]\s*/i,''),a:''};
    }else if(current){
      current.a=current.a?`${current.a}\n\n${paragraph}`:paragraph;
    }
  });

  if(current)faqs.push(current);
  return faqs.length?faqs:[{q:'Pregunta frecuente',a:t}];
}

function renderSectorFaqAccordion(v){
  const faqs=parseSectorFaqs(v);
  if(!faqs.length)return '';
  return `<div class="sector-faq-accordion">${faqs.map((faq,i)=>`<details ${i===0?'open':''}><summary><span>${escapeHtml(faq.q)}</span></summary><div class="sector-faq-answer">${formatText(faq.a)}</div></details>`).join('')}</div>`;
}

function renderSectorFaqBlock(a){
  const faqData=a.faqs_repeater||a.preguntas_frecuentes||a.faqs_items||a.faqs;
  if(!faqData)return '';
  return `<section class="sector-faq-block"><div class="sector-faq-copy"><span class="sector-section-kicker">Preguntas frecuentes</span><h2>Primero aclaramos las dudas. Después activamos la estrategia.</h2><p>Resolvemos las preguntas clave antes de proponer una receta digital para tu negocio.</p></div>${renderSectorFaqAccordion(faqData)}</section>`;
}
