// Teste para identificar o problema de fuso horário

console.log('=== TESTE DE FUSO HORÁRIO ===');

// Simular o comportamento atual do StudySessionModal
const now = new Date();
console.log('Data atual:', now.toString());
console.log('Data atual UTC:', now.toUTCString());
console.log('Data atual ISO:', now.toISOString());

// Simular o valor min do input date
const minDate = new Date().toISOString().split('T')[0];
console.log('Valor min do input date:', minDate);

// Simular seleção de data e hora pelo usuário
const selectedDate = minDate; // Hoje
const selectedTime = '21:30'; // 21:30

console.log('\n=== SIMULAÇÃO DE AGENDAMENTO ===');
console.log('Data selecionada:', selectedDate);
console.log('Hora selecionada:', selectedTime);

// Método atual do StudySessionModal
const dateParts = selectedDate.split('-').map(part => parseInt(part));
const timeParts = selectedTime.split(':').map(part => parseInt(part));

const year = dateParts[0];
const month = dateParts[1] - 1; // Meses em JS são 0-indexed
const day = dateParts[2];
const hours = timeParts[0];
const minutes = timeParts[1];

const dateObj = new Date(year, month, day, hours, minutes);
console.log('\nData criada com new Date(year, month, day, hours, minutes):');
console.log('Local:', dateObj.toString());
console.log('UTC:', dateObj.toUTCString());
console.log('ISO:', dateObj.toISOString());

// Verificar diferença de fuso horário
const timezoneOffset = dateObj.getTimezoneOffset();
console.log('\nTimezone offset (minutos):', timezoneOffset);
console.log('Timezone offset (horas):', timezoneOffset / 60);

// Simular o que acontece quando convertemos para ISO
const isoString = dateObj.toISOString();
const parsedBack = new Date(isoString);
console.log('\nApós conversão ISO e parse de volta:');
console.log('ISO string:', isoString);
console.log('Parsed back local:', parsedBack.toString());
console.log('Parsed back UTC:', parsedBack.toUTCString());

// Verificar se a data mudou
const originalHour = dateObj.getHours();
const parsedHour = new Date(isoString).getHours();
console.log('\nComparação de horas:');
console.log('Hora original (local):', originalHour);
console.log('Hora após ISO parse (local):', parsedHour);
console.log('Diferença:', parsedHour - originalHour);

// Teste com diferentes horários
console.log('\n=== TESTE COM DIFERENTES HORÁRIOS ===');
const testTimes = ['20:00', '21:00', '22:00', '23:00', '23:59'];

testTimes.forEach(time => {
  const [h, m] = time.split(':').map(n => parseInt(n));
  const testDate = new Date(year, month, day, h, m);
  const testISO = testDate.toISOString();
  const testParsed = new Date(testISO);
  
  console.log(`${time} -> ISO: ${testISO} -> Parsed back: ${testParsed.getHours()}:${testParsed.getMinutes().toString().padStart(2, '0')}`);
});

console.log('\n=== FIM DO TESTE ===');