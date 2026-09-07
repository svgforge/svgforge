(function () {
  function onCopied(button) {
    button.classList.add('copied');
    button.textContent = 'Copied';
    setTimeout(() => {
      button.classList.remove('copied');
      button.textContent = button.dataset.copyLabel;
    }, 1500);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy]');
    if (button) {
      navigator.clipboard.writeText(button.dataset.copy.trim()).then(() => onCopied(button));
    }
  });
}());
