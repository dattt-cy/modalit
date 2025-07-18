Modalit.elements = [];
function Modalit(options = {}) {
    if (!options.content && !options.templateId) {
        console.error("Either templateId or content must be provided");
        return;
    }
    if (options.content && options.templateId) {
        options.templateId = null;
        console.warn("Both content and templateId provided. Using content.");
    }
    if (options.templateId) {
        this.template = document.querySelector(`#${options.templateId}`);
        if (!this.template) {
            console.error(`Template not found: ${options.templateId}`);
            return;
        }
    }
    this.opts = Object.assign(
        {
            enableScrollLock: true,
            footer: false,
            destroyOnClose: true,
            closeMethods: ["button", "overlay", "escape"],
            cssClass: [],
            scrollLockTarget: () => document.body,
        },
        options
    );
    this.content = this.opts.content;

    const { closeMethods } = this.opts;
    this._allowButtonClose = closeMethods.includes("button");
    this._allowBackdropClose = closeMethods.includes("overlay");
    this._allowEscapeClose = closeMethods.includes("escape");
}
Modalit.prototype._getScrollBarWidth = function () {
    if (this._scrollBarWidth) {
        return this._scrollBarWidth;
    }

    const div = document.createElement("div");
    Object.assign(div.style, {
        overflow: "scroll",
        position: "absolute",
        top: "-9999px",
    });
    document.body.append(div);
    this._scrollBarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return this._scrollBarWidth;
};

Modalit.prototype._build = function () {
    const contentNode = this.content
        ? document.createElement("div")
        : this.template.content.cloneNode(true);
    if (this.content) {
        contentNode.innerHTML = this.content;
    }
    this._backdrop = document.createElement("div");
    this._backdrop.className = "modalit";

    const container = document.createElement("div");
    container.className = "modalit__container";

    if (Array.isArray(this.opts.cssClass) && this.opts.cssClass.length > 0) {
        container.classList.add(...this.opts.cssClass);
    }

    if (this._allowButtonClose) {
        const closeBtn = this._createButton("&times;", "modalit__close", () => {
            this.close();
        });
        container.append(closeBtn);
    }

    this._modalContent = document.createElement("div");
    this._modalContent.className = "modalit__content";

    this._modalContent.append(contentNode);
    container.append(this._modalContent);
    this._backdrop.append(container);
    document.body.append(this._backdrop);
    if (this.opts.footer) {
        this._modalFooter = document.createElement("div");
        this._modalFooter.className = "modalit__footer";
        this._renderFooterContent();
        this._renderFooterButtons();
        container.append(this._modalFooter);
    }
};
Modalit.prototype.setContent = function (content) {
    this.content = content;
    if (this._modalContent) {
        this._modalContent.innerHTML = content;
    }
};
Modalit.prototype.setFooterContent = function (content) {
    this._footerContent = content;
    this._renderFooterContent();
};
Modalit.prototype._renderFooterContent = function () {
    if (this._modalFooter && this._footerContent) {
        this._modalFooter.innerHTML = this._footerContent;
    }
};

Modalit.prototype.open = function () {
    Modalit.elements.push(this);
    if (!this._backdrop) {
        this._build();
    }
    setTimeout(() => {
        this._backdrop.classList.add("modalit--show");
    }, 0);

    if (this._allowBackdropClose) {
        this._backdrop.onclick = (e) => {
            if (e.target === this._backdrop) {
                this.close();
            }
        };
    }

    if (this._allowEscapeClose) {
        document.addEventListener("keydown", this._handleEscapeKey.bind(this));
    }
    this._onTransitionEnd(this.opts.onOpen);
    if (this.opts.enableScrollLock && Modalit.elements.length === 1) {
        const target = this.opts.scrollLockTarget();
        if (this._hasScrollbar(target)) {
            target.classList.add("modalit--no-scroll");
            const targetPaddingRight = parseInt(
                getComputedStyle(target).paddingRight
            );

            target.style.paddingRight = `${
                targetPaddingRight + this._getScrollBarWidth()
            }px`;
        }
    }

    return this._backdrop;
};
Modalit.prototype._hasScrollbar = (target) => {
    if ([document.body, document.documentElement].includes(target)) {
        return (
            document.documentElement.scrollHeight >
                document.documentElement.clientHeight ||
            document.body.scrollHeight > document.body.clientHeight
        );
    }
    return target.scrollHeight > target.clientHeight;
};

Modalit.prototype._handleEscapeKey = function (e) {
    const lastModal = Modalit.elements[Modalit.elements.length - 1];

    if (e.key === "Escape" && lastModal === this) {
        this.close();
    }
};
Modalit.prototype._onTransitionEnd = function (callback) {
    const handler = (e) => {
        if (e.propertyName !== "transform") return;
        this._backdrop.removeEventListener("transitionend", handler);
        if (typeof callback === "function") callback();
    };
    this._backdrop.addEventListener("transitionend", handler);
};
Modalit.prototype._footerButtons = [];

Modalit.prototype.addFooterButton = function (content, className, onClick) {
    const button = this._createButton(content, className, onClick);
    this._footerButtons.push(button);
    this._renderFooterButtons();
};
Modalit.prototype._renderFooterButtons = function () {
    if (this._modalFooter) {
        this._footerButtons.forEach((btn) => {
            this._modalFooter.append(btn);
        });
    }
};
Modalit.prototype._createButton = function (content, className, onClick) {
    const button = document.createElement("button");
    button.className = className;
    button.innerHTML = content;
    button.onclick = onClick;
    return button;
};
Modalit.prototype.close = function (isDestroy = this.opts.destroyOnClose) {
    Modalit.elements.pop();
    this._backdrop.classList.remove("modalit--show");
    if (this._allowEscapeClose) {
        document.removeEventListener("keydown", this._handleEscapeKey);
    }
    this._onTransitionEnd(() => {
        if (isDestroy && this._backdrop) {
            this._backdrop.remove();
            this._backdrop = null;
            this._modalFooter = null;
        }
        if (Modalit.elements.length === 0 && this.opts.enableScrollLock) {
            const target = this.opts.scrollLockTarget();
            if (this._hasScrollbar(target)) {
                target.classList.remove("modalit--no-scroll");
                target.style.paddingRight = "";
            }
        }

        if (typeof this.opts.onClose === "function") {
            this.opts.onClose();
        }
    });
};
Modalit.prototype.destroy = function () {
    this.close(true);
};
