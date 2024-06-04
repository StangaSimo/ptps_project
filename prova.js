
process.on('SIGINT', () => {
  console.log('È arrivato!');
  process.exit(); // Chiude il processo in modo corretto
});

// Esempio di attesa infinita per mantenere il programma in esecuzione
setInterval(() => {}, 1000);
