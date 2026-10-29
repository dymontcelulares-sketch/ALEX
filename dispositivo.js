window.AlexDevice = {
  async info() {
    const ua = navigator.userAgent || "Desconhecido";
    const data = {
      navegador: ua,
      idioma: navigator.language || "Desconhecido",
      plataforma: navigator.userAgentData?.platform || navigator.platform || "Não informada",
      larguraTela: screen.width,
      alturaTela: screen.height,
      online: navigator.onLine,
      memoriaAproximadaGB: navigator.deviceMemory || null,
      nucleosLogicos: navigator.hardwareConcurrency || null
    };
    // O navegador normalmente não revela o modelo exato nem a versão Android com segurança.
    return data;
  }
};
