import test from 'node:test';
import assert from 'node:assert/strict';
import { getScenario } from '../public/demo.js';
test('selectsMatchingScenario', () => {
  for (const [id, goal] of [['expert','Представить экспертизу'],['team','Организовать работу'],['automation','Подготовить бриф']]) {
    const result = getScenario(id); assert.equal(result.id,id); assert.equal(result.goal,goal); assert.ok(result.input.length > 20); assert.ok(result.scope.length); assert.ok(result.questions.length);
  }
});
test('rejectsUnknownScenario', () => { for (const key of ['missing','toString','__proto__',null]) assert.equal(getScenario(key),null); });
