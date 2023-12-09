function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let _lastInput=null;

document.getElementById('form_id').addEventListener('submit', function(event) {
    // Prevent the default form submission behavior
    event.preventDefault();
  });

  document.getElementById('input_text').addEventListener('keydown', function(event) {
    // Check if the pressed key is Enter (key code 13)
    if (event.key === 'Enter') {
      // Prevent the form submission
      addInputToConsole(document.getElementById('input_text').value);
      document.getElementById('input_text').value = "";
      event.preventDefault();
    }
  });

function scrollConsoleToBottom() {
  var consola = document.getElementById('consola');
  requestAnimationFrame(function() {
    consola.scrollTop = consola.scrollHeight;
  });
}

 function addInputToConsole(inputText) {
  _lastInput = inputText;
  document.getElementById('consola').value += "> " + inputText + "\n";
  scrollConsoleToBottom();
}

function printToConsole(textToPrint) {
  var consola = document.getElementById('consola');
  consola.value += textToPrint + "\n";
  scrollConsoleToBottom();
}

function clearConsole() {
  document.getElementById('consola').value = "";
}

async function readInput() {
    _lastInput = null;
    do {
        await sleep(10);
    } while(!_lastInput);

    return _lastInput;
}