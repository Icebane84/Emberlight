function ollamaAdapterFactory(config) {
  const host = config.host || "http://localhost:11434";
  const modelName = config.model || "qwen2.5-coder:7b";

  return Promise.resolve({
    async generate(prompt, options) {
      const opts = options || {};
      const onToken = opts.onToken;

      const res = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: typeof onToken === "function",
          options: {
            num_predict: opts.maxTokens || 2048,
            temperature: opts.temperature || 0.2
          }
        })
      });

      if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);

      // Handle streaming tokens if requested
      if (typeof onToken === "function" && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Ollama streams line-delimited JSON
          const lines = chunk.split("\n").filter(Boolean);
          for (const line of lines) {
            const json = JSON.parse(line);
            if (json.response) {
              onToken(json.response);
              fullText += json.response;
            }
          }
        }
        return fullText;
      }

      // Non-streaming fallback
      const data = await res.json();
      return data.response;
    },

    async destroy() {
      // Nothing to tear down for an HTTP endpoint
    }
  });
}