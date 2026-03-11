(function () {
  if (window.__bioskinaChatbotLoaded) return;
  window.__bioskinaChatbotLoaded = true;

  var config = Object.assign(
    {
      apiBase: window.location.origin,
      storeBaseUrl: "https://bioskina.com",
      title: "Bioskina assistent",
      brandName: "Bioskina",
      launcherLabel: "Küsi toodete või klienditoe kohta",
      tooltipTitle: "Tere!",
      tooltipText:
        "Küsi näiteks nahahoolduse, toodete või klienditoe kohta.",
      welcomeMessage:
        "Tere! Olen Bioskina assistent. Aitan sul leida sobivaid naha-, keha- ja juuksehooldustooteid ning vastan tarne, tagastuse ja makse küsimustele.",
      exampleMessage:
        'Näiteks võid kirjutada "otsi tundlikule nahale näopuhastus", "soovita kuivale nahale seerumit" või küsida "kuidas tagastus käib?"',
      poweredByUrl: "https://growlinee.com/ee",
      poweredByLabel: "Powered by Growlinee",
    },
    window.BIOSKINA_CHATBOT_CONFIG || {}
  );

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(product) {
    if (!product || typeof product.price !== "number" || !product.price) return "";
    return product.price.toFixed(2) + " " + (product.currency || "EUR");
  }

  function createElement(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function createEmojiIcon(className) {
    return (
      '<span class="' +
      className +
      '" aria-hidden="true">💬</span>'
    );
  }

  var root = createElement("div", "bio-chatbot");
  var fabWrap = createElement("div", "bio-chatbot__fab-wrap");
  var tooltip = createElement(
    "button",
    "bio-chatbot__tooltip",
    '<span class="bio-chatbot__tooltip-title">' +
      escapeHtml(config.tooltipTitle) +
      '</span><span class="bio-chatbot__tooltip-body">' +
      escapeHtml(config.tooltipText) +
      "</span>"
  );
  tooltip.type = "button";
  tooltip.setAttribute("aria-label", config.launcherLabel);
  var launcher = createElement(
    "button",
    "bio-chatbot__launcher",
    '<span aria-hidden="true">💬</span><span class="bio-chatbot__sr-only">' +
      escapeHtml(config.launcherLabel) +
      "</span>"
  );
  launcher.type = "button";
  launcher.setAttribute("aria-label", config.launcherLabel);

  var panel = createElement("section", "bio-chatbot__panel bio-chatbot__panel--hidden");
  panel.setAttribute("aria-live", "polite");

  var header = createElement(
    "header",
    "bio-chatbot__header",
    '<div class="bio-chatbot__brand">' +
      '<div class="bio-chatbot__brand-icon">' +
      createEmojiIcon("bio-chatbot__brand-emoji") +
      "</div>" +
      '<div class="bio-chatbot__brand-copy">' +
      '<p class="bio-chatbot__eyebrow">Natural cosmetics · Support</p><h2>' +
      escapeHtml(config.title) +
      '</h2><a class="bio-chatbot__powered" href="' +
      escapeHtml(config.poweredByUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(config.poweredByLabel) +
      "</a></div></div>" +
      '<button type="button" class="bio-chatbot__close" aria-label="Close">×</button>'
  );

  var messages = createElement("div", "bio-chatbot__messages");
  var composer = createElement(
    "form",
    "bio-chatbot__composer",
    '<textarea class="bio-chatbot__input" rows="1" placeholder="Search products or ask a question..."></textarea>' +
      '<button class="bio-chatbot__send" type="submit">Send</button>'
  );

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(composer);

  fabWrap.appendChild(tooltip);
  fabWrap.appendChild(launcher);

  root.appendChild(panel);
  root.appendChild(fabWrap);
  document.body.appendChild(root);

  var closeButton = header.querySelector(".bio-chatbot__close");
  var input = composer.querySelector(".bio-chatbot__input");
  var sendButton = composer.querySelector(".bio-chatbot__send");
  var isBusy = false;
  var initialized = false;

  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  function setPanelOpen(nextOpen) {
    panel.classList.toggle("bio-chatbot__panel--hidden", !nextOpen);
    fabWrap.classList.toggle("bio-chatbot__fab-wrap--hidden", !!nextOpen);
    if (nextOpen) {
      ensureWelcomeMessages();
      window.setTimeout(function () {
        input.focus();
        scrollToBottom();
      }, 80);
    }
  }

  function appendBubble(role, text) {
    var wrapper = createElement("article", "bio-chatbot__message bio-chatbot__message--" + role);
    var bubble = createElement(
      "div",
      "bio-chatbot__bubble",
      escapeHtml(text || "")
    );
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollToBottom();
    return { wrapper: wrapper, bubble: bubble };
  }

  function ensureWelcomeMessages() {
    if (initialized) return;
    appendBubble("assistant", config.welcomeMessage);
    appendBubble("assistant", config.exampleMessage);
    initialized = true;
  }

  function appendProducts(container, items) {
    if (!Array.isArray(items) || !items.length) return;
    var grid = createElement("div", "bio-chatbot__products");

    items.forEach(function (product) {
      var card = createElement("a", "bio-chatbot__product");
      card.href = product.url || config.storeBaseUrl;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      var image = product.imageUrl
        ? '<div class="bio-chatbot__product-image"><img src="' +
          escapeHtml(product.imageUrl) +
          '" alt="' +
          escapeHtml(product.name) +
          '"></div>'
        : '<div class="bio-chatbot__product-image bio-chatbot__product-image--empty"></div>';

      var price = formatPrice(product);

      card.innerHTML =
        image +
        '<div class="bio-chatbot__product-copy">' +
        '<h3>' + escapeHtml(product.name) + '</h3>' +
        (price ? '<p class="bio-chatbot__product-price">' + escapeHtml(price) + "</p>" : "") +
        '<span class="bio-chatbot__product-cta">View product</span>' +
        "</div>";

      grid.appendChild(card);
    });

    container.appendChild(grid);
    scrollToBottom();
  }

  function setBusy(nextBusy) {
    isBusy = !!nextBusy;
    input.disabled = isBusy;
    sendButton.disabled = isBusy;
    sendButton.textContent = isBusy ? "..." : "Send";
  }

  function parseSseBlock(block) {
    var lines = String(block || "").split("\n");
    var eventName = "message";
    var data = "";

    lines.forEach(function (line) {
      if (line.indexOf("event:") === 0) {
        eventName = line.slice(6).trim();
      } else if (line.indexOf("data:") === 0) {
        data += line.slice(5).trim();
      }
    });

    if (!data) return null;
    try {
      return { event: eventName, payload: JSON.parse(data) };
    } catch (_e) {
      return null;
    }
  }

  async function streamChat(message, assistantNode) {
    var response = await fetch(config.apiBase + "/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message }),
    });

    if (!response.ok) {
      throw new Error("Request failed.");
    }

    if (!response.body) {
      var fallback = await fetch(config.apiBase + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message }),
      });
      var fallbackJson = await fallback.json();
      if (!fallbackJson.ok) throw new Error(fallbackJson.error || "No response.");
      assistantNode.bubble.textContent = fallbackJson.assistantText || "";
      appendProducts(assistantNode.wrapper, fallbackJson.products || []);
      return;
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";

    while (true) {
      var step = await reader.read();
      if (step.done) break;

      buffer += decoder.decode(step.value, { stream: true });
      var parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      parts.forEach(function (part) {
        var parsed = parseSseBlock(part);
        if (!parsed) return;

        if (parsed.event === "chunk") {
          assistantNode.bubble.textContent = assistantNode.bubble.textContent
            ? assistantNode.bubble.textContent + " " + parsed.payload.text
            : parsed.payload.text;
        } else if (parsed.event === "products") {
          appendProducts(assistantNode.wrapper, parsed.payload.items || []);
        } else if (parsed.event === "error") {
          throw new Error(parsed.payload.message || "Stream error.");
        }

        scrollToBottom();
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isBusy) return;

    var message = String(input.value || "").trim();
    if (!message) return;

    appendBubble("user", message);
    var assistantNode = appendBubble("assistant", "Thinking...");
    input.value = "";
    setBusy(true);

    try {
      assistantNode.bubble.textContent = "";
      await streamChat(message, assistantNode);
      if (!assistantNode.bubble.textContent.trim()) {
        assistantNode.bubble.textContent = "No response received.";
      }
    } catch (error) {
      assistantNode.bubble.textContent =
        (error && error.message) || "An unknown error occurred.";
    } finally {
      setBusy(false);
      input.focus();
      scrollToBottom();
    }
  }

  composer.addEventListener("submit", handleSubmit);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  launcher.addEventListener("click", function () {
    setPanelOpen(true);
  });

  tooltip.addEventListener("click", function () {
    setPanelOpen(true);
  });

  closeButton.addEventListener("click", function () {
    setPanelOpen(false);
  });
})();
