window.AlexFiles = {
  async chooseFile() {
    // O seletor nativo só dá acesso aos arquivos que o usuário escolher.
    return new Promise(resolve => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = ".txt,.md,.json,.csv,.log";
      input.onchange = async () => {
        const selected = Array.from(input.files || []);
        const result = [];
        for (const file of selected) {
          if (file.size > 1024 * 1024) {
            result.push({name:file.name, error:"Arquivo maior que 1 MB não foi lido."});
            continue;
          }
          try {
            result.push({name:file.name, size:file.size, content:await file.text()});
          } catch {
            result.push({name:file.name, error:"Não foi possível ler este arquivo."});
          }
        }
        resolve(result);
      };
      input.oncancel = () => resolve([]);
      input.click();
    });
  }
};
