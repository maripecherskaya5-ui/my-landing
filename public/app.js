import { config } from './config.js';
import { getScenario } from './demo.js';
import { validateLead, submitLead } from './core.js';

const allowedEvents = new Set(['case_open','demo_select','contact_click','form_start','form_error','generate_lead']);
function track(name,metadata={}) {
  if (!allowedEvents.has(name)) return;
  const detail = {name};
  for (const key of ['section','scenario']) if (typeof metadata[key] === 'string') detail[key] = metadata[key];
  window.dispatchEvent(new CustomEvent('landing:analytics',{detail}));
}

const navigation = document.querySelector('#navigation');
const menuButton = document.querySelector('.menu-toggle');
function closeMenu(returnFocus=false) { navigation.classList.remove('is-open'); menuButton.setAttribute('aria-expanded','false'); if (returnFocus) menuButton.focus(); }
menuButton.addEventListener('click',()=>{const isOpen = navigation.classList.toggle('is-open');menuButton.setAttribute('aria-expanded',String(isOpen));});
document.addEventListener('keydown',event=>{if(event.key==='Escape' && navigation.classList.contains('is-open')) closeMenu(true);});
navigation.addEventListener('click',event=>{if(event.target.closest('a')) closeMenu();});
matchMedia('(min-width: 801px)').addEventListener('change',event=>{if(event.matches) closeMenu();});
menuButton.hidden=false;
document.documentElement.classList.add('has-js');

const demoButtons = [...document.querySelectorAll('[data-scenario]')];
demoButtons.forEach(button=>button.addEventListener('click',()=>{
  const scenario = getScenario(button.dataset.scenario);
  if(!scenario)return;
  demoButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  document.querySelector('#demo-input').textContent=scenario.input;
  document.querySelector('#demo-goal').textContent=scenario.goal;
  document.querySelector('#demo-scope').textContent=scenario.scope.join(', ')+'.';
  document.querySelector('#demo-questions').textContent=scenario.questions.join(', ')+'.';
  track('demo_select',{scenario:scenario.id});
}));
document.querySelector('.demo-options').hidden=false;
document.querySelectorAll('[data-case]').forEach(details=>details.addEventListener('toggle',()=>{if(details.open)track('case_open',{scenario:details.dataset.case});}));
document.querySelectorAll('a[href="#contact"]').forEach(link=>link.addEventListener('click',()=>track('contact_click',{section:link.closest('section')?.id||'navigation'})));

const form = document.querySelector('#contact-form');
const fieldset = form.querySelector('fieldset');
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('[type="submit"]');
const submitLabel = submitButton.querySelector('span');
let busy=false, started=false, submitted=false;
const preview = !config.leadEndpoint;
const idleLabel = preview ? 'Проверить заполнение' : 'Отправить задачу';
submitLabel.textContent=idleLabel;
if(!preview) {document.querySelector('#form-notice').textContent='Опишите задачу — продолжим обсуждение по вашему контакту.';}
form.addEventListener('input',event=>{
  if(!started){started=true;track('form_start',{section:'contact'});}
  if(!busy && submitted){submitted=false;submitButton.disabled=false;status.textContent='';}
  const name=event.target.name;
  if(['contact','task'].includes(name)){event.target.removeAttribute('aria-invalid');document.querySelector(`#${name}-error`).textContent='';}
});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||submitted)return;
  const input={contact:form.elements.contact.value,task:form.elements.task.value};
  const validation=validateLead(input);
  for(const name of ['contact','task']) {const error=validation.errors[name];form.elements[name].setAttribute('aria-invalid',String(Boolean(error)));document.querySelector(`#${name}-error`).textContent=error||'';}
  if(!validation.valid){status.textContent='Пожалуйста, проверьте отмеченные поля.';form.elements[Object.keys(validation.errors)[0]].focus();track('form_error',{section:'contact'});return;}
  busy=true;fieldset.disabled=true;submitLabel.textContent=preview?'Проверяем…':'Отправляем…';status.textContent='';form.setAttribute('aria-busy','true');
  try {
    const result=await submitLead(validation.values,{endpoint:config.leadEndpoint});
    status.textContent=result.message;
    submitted=result.status==='success';
    if(submitted)track('generate_lead',{section:'contact'});
    if(['error','rate_limited'].includes(result.status))track('form_error',{section:'contact'});
  } finally {busy=false;fieldset.disabled=false;submitButton.disabled=submitted;submitLabel.textContent=submitted?'Задача отправлена':idleLabel;form.removeAttribute('aria-busy');}
});
form.noValidate=true;
fieldset.disabled=false;
