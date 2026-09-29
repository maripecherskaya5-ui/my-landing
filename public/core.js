const failure = 'Не удалось подтвердить отправку. Ваш текст сохранён на странице. Попробуйте ещё раз или напишите в Telegram.';
export function validateLead(input) {
  const source = input && typeof input === 'object' ? input : {};
  const values = {contact: typeof source.contact === 'string' ? source.contact.trim() : '',task:typeof source.task === 'string' ? source.task.trim() : ''};
  const errors = {};
  const contactLength = Array.from(values.contact).length;
  const taskLength = Array.from(values.task).length;
  if (contactLength < 3 || contactLength > 200) errors.contact = 'Укажите, как с вами связаться: от 3 до 200 символов.';
  if (taskLength < 10 || taskLength > 3000) errors.task = 'Опишите задачу: от 10 до 3000 символов.';
  return {valid:Object.keys(errors).length === 0,values,errors};
}
export async function submitLead(input,{endpoint,fetchImpl=fetch,timeoutMs=15000}={}) {
  const validation = validateLead(input);
  if (!validation.valid) return {status:'error',message:'Проверьте заполнение полей.'};
  if (!endpoint) return {status:'preview',message:'Поля заполнены. Это предпросмотр — сообщение не отправлено.'};
  if (typeof endpoint !== 'string' || !/^\/[a-zA-Z0-9/_-]+$/.test(endpoint) || endpoint.startsWith('//')) return {status:'error',message:failure};
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response = await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(validation.values),signal:controller.signal,redirect:'error',credentials:'same-origin'});
    if (response.status === 429) return {status:'rate_limited',message:'Слишком много попыток. Подождите и повторите отправку.'};
    if (!response.ok) return {status:'error',message:failure};
    const body = await response.json();
    if (body?.ok !== true) return {status:'error',message:failure};
    return {status:'success',message:'Задача отправлена. Продолжим обсуждение по указанному контакту.'};
  } catch { return {status:'error',message:failure}; }
  finally { clearTimeout(timeout); }
}
