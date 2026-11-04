
const body = document.body;
const themeButtons = document.querySelectorAll(".theme-toggle");

function updateThemeButton() {
    themeButtons.forEach(button => {
        button.textContent = body.classList.contains("dark-mode")
            ? "☀️ Light Mode"
            : "🌙 Dark Mode";
    });
}

try {
    if (localStorage.getItem("cafeTheme") === "dark") {
        body.classList.add("dark-mode");
    }
} catch (error) {
    console.warn("Theme preference could not be loaded.", error);
}

updateThemeButton();

themeButtons.forEach(button => {
    button.addEventListener("click", () => {
        body.classList.toggle("dark-mode");

        try {
            localStorage.setItem(
                "cafeTheme",
                body.classList.contains("dark-mode") ? "dark" : "light"
            );
        } catch (error) {
            console.warn("Theme preference could not be saved.", error);
        }

        updateThemeButton();
    });
});

const menuToggle = document.querySelector(".menu-toggle");
const navbar = document.querySelector(".navbar");

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
        navbar.classList.toggle("open");
        menuToggle.textContent = navbar.classList.contains("open") ? "✕" : "☰";
    });

    navbar.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navbar.classList.remove("open");
            menuToggle.textContent = "☰";
        });
    });
}

const galleryImages = document.querySelectorAll(".gallery-grid img");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxClose = document.querySelector(".lightbox-close");

galleryImages.forEach(image => {
    image.addEventListener("click", () => {
        if (!lightbox || !lightboxImage) return;

        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        lightbox.classList.add("open");
    });
});

function closeLightbox() {
    if (lightbox && lightboxImage) {
        lightbox.classList.remove("open");
        lightboxImage.src = "";
    }
}

if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
}

if (lightbox) {
    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) closeLightbox();
    });
}

const backToTop = document.createElement("button");
backToTop.className = "back-to-top";
backToTop.textContent = "↑";
backToTop.setAttribute("aria-label", "Back to top");
document.body.appendChild(backToTop);

window.addEventListener("scroll", () => {
    backToTop.classList.toggle("visible", window.scrollY > 350);
});

backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

const bookingForm = document.querySelector("#bookingForm");
const bookingDate = document.querySelector("#date");
const formMessage = document.querySelector("#formMessage");

if (bookingDate) {
    const today = new Date();

    bookingDate.min = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
    ).toISOString().split("T")[0];
}

if (bookingForm) {
    bookingForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.querySelector("#name")?.value.trim();
        const phone = document.querySelector("#phone")?.value.trim();
        const date = document.querySelector("#date")?.value;
        const guests = document.querySelector("#guests")?.value;

        if (!name || !phone || !date || !guests) {
            formMessage.textContent = "Please fill in all required fields.";
            formMessage.style.color = "#d93025";
            return;
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            formMessage.textContent = "Please enter a valid 10-digit phone number.";
            formMessage.style.color = "#d93025";
            return;
        }

        if (date < bookingDate.min) {
            formMessage.textContent = "Please select today or a future date.";
            formMessage.style.color = "#d93025";
            return;
        }

        formMessage.textContent =
            `Thank you, ${name}! Your table booking request has been submitted successfully.`;

        formMessage.style.color = "#26834a";
        bookingForm.reset();
    });
}

/* Shopping Cart */

let cart = [];

try {
    const savedCart = JSON.parse(
        localStorage.getItem("brewBloomCart") || "[]"
    );

    if (Array.isArray(savedCart)) {
        cart = savedCart.filter(item =>
            item &&
            typeof item.name === "string" &&
            Number.isFinite(Number(item.price)) &&
            Number(item.price) > 0 &&
            Number.isInteger(Number(item.quantity)) &&
            Number(item.quantity) > 0
        ).map(item => ({
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity)
        }));
    }
} catch (error) {
    cart = [];
}

function saveCart() {
    try {
        localStorage.setItem("brewBloomCart", JSON.stringify(cart));
    } catch (error) {
        console.warn("Cart could not be saved.", error);
    }
}

function formatPrice(amount) {
    return "₹" + Number(amount).toFixed(2);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

let cartToastTimer;

/* Create the cart drawer and notification */

function createCartInterface() {
    if (!document.querySelector(".menu-section")) return;

    if (!document.querySelector("#cartDrawer")) {
        const drawer = document.createElement("div");

        drawer.id = "cartDrawer";
        drawer.className = "cart-drawer";
        drawer.setAttribute("aria-hidden", "true");

        drawer.innerHTML = `
            <div class="cart-drawer-backdrop" data-cart-close></div>

            <aside class="cart-drawer-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawerTitle">

                <div class="cart-drawer-header">
                    <div>
                        <p class="drawer-eyebrow">BREW & BLOOM</p>
                        <h2 id="drawerTitle">
                            Your Cart <span id="drawerCartCount">0</span>
                        </h2>
                    </div>

                    <button type="button"
                        class="drawer-close"
                        data-cart-close
                        aria-label="Close cart">×</button>
                </div>

                <div class="drawer-success" id="drawerSuccess">
                    <span class="drawer-success-icon">✓</span>
                    <div>
                        <strong>Item added to cart!</strong>
                        <p id="drawerSuccessText">
                            Your item is now in your cart.
                        </p>
                    </div>
                </div>

                <div class="drawer-items" id="drawerCartItems"></div>

                <div class="cart-drawer-footer">
                    <div class="drawer-total-row">
                        <span>Subtotal</span>
                        <strong id="drawerSubtotal">₹0.00</strong>
                    </div>

                    <p class="drawer-discount" id="drawerDiscount">
                        Add items worth ₹799 to unlock 10% off.
                    </p>

                    <div class="drawer-total-row drawer-grand-total">
                        <span>Total</span>
                        <strong id="drawerTotal">₹0.00</strong>
                    </div>

                    <button type="button"
                        class="drawer-view-cart"
                        id="drawerViewCart">
                        View Full Cart ↓
                    </button>

                    <button type="button"
                        class="drawer-continue"
                        data-cart-close>
                        Continue Shopping
                    </button>
                </div>
            </aside>
        `;

        document.body.appendChild(drawer);
    }

    if (!document.querySelector("#floatingCartButton")) {
        const floatingButton = document.createElement("button");

        floatingButton.id = "floatingCartButton";
        floatingButton.className = "floating-cart-button";
        floatingButton.type = "button";
        floatingButton.innerHTML = `
            🛒 <span>Cart</span>
            <b id="floatingCartCount">0</b>
        `;

        floatingButton.addEventListener("click", openCartDrawer);
        document.body.appendChild(floatingButton);
    }

    if (!document.querySelector("#cartToast")) {
        const toast = document.createElement("div");

        toast.id = "cartToast";
        toast.className = "cart-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");

        document.body.appendChild(toast);
    }

    const drawer = document.querySelector("#cartDrawer");

    drawer.addEventListener("click", event => {
        if (event.target.matches("[data-cart-close]")) {
            closeCartDrawer();
            return;
        }

        const actionButton = event.target.closest(
            "button[data-drawer-action]"
        );

        if (!actionButton) return;

        const index = Number(actionButton.dataset.index);
        const action = actionButton.dataset.drawerAction;

        if (action === "increase") changeQuantity(index, 1);
        if (action === "decrease") changeQuantity(index, -1);
        if (action === "remove") removeFromCart(index);
    });

    document.querySelector("#drawerViewCart").addEventListener("click", () => {
        closeCartDrawer();

        document.querySelector("#shopping-cart")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    document.querySelector("#cartToast").addEventListener("click", event => {
        if (event.target.closest(".toast-view-cart")) {
            closeCartDrawer();

            document.querySelector("#shopping-cart")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

        if (event.target.closest(".toast-close")) {
            hideCartToast();
        }
    });
}

function openCartDrawer() {
    const drawer = document.querySelector("#cartDrawer");

    if (!drawer) return;

    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-drawer-open");
}

function closeCartDrawer() {
    const drawer = document.querySelector("#cartDrawer");

    if (!drawer) return;

    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-drawer-open");
}

function hideCartToast() {
    const toast = document.querySelector("#cartToast");

    if (toast) toast.classList.remove("show");

    window.clearTimeout(cartToastTimer);
}

function showCartToast(name) {
    const toast = document.querySelector("#cartToast");

    if (!toast) return;

    toast.innerHTML = `
        <span class="toast-check">✓</span>

        <span class="toast-copy">
            <strong>Added to cart!</strong>
            <small>${escapeHTML(name)} has been added to your cart.</small>
            <button type="button" class="toast-view-cart">
                View cart
            </button>
        </span>

        <button type="button"
            class="toast-close"
            aria-label="Close notification">×</button>
    `;

    toast.classList.add("show");

    window.clearTimeout(cartToastTimer);

    cartToastTimer = window.setTimeout(hideCartToast, 5000);
}

function addToCart(name, price) {
    const numericPrice = Number(price);

    if (!name || !Number.isFinite(numericPrice) || numericPrice <= 0) {
        return;
    }

    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: name,
            price: numericPrice,
            quantity: 1
        });
    }

    saveCart();
    renderCart();
    renderDrawerCart(name);
    showCartToast(name);
    openCartDrawer();
}

function changeQuantity(index, amount) {
    if (!cart[index]) return;

    cart[index].quantity += amount;

    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }

    saveCart();
    renderCart();
    renderDrawerCart();
}

function removeFromCart(index) {
    if (!cart[index]) return;

    cart.splice(index, 1);

    saveCart();
    renderCart();
    renderDrawerCart();
}

function getCartTotals() {
    const count = cart.reduce(
        (sum, item) => sum + item.quantity, 0
    );

    const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const discount = subtotal >= 799 ? subtotal * 0.10 : 0;

    return {
        count,
        subtotal,
        discount,
        total: subtotal - discount
    };
}

function renderCartItemsHTML(actionAttribute = "data-action") {
    if (cart.length === 0) {
        return `
            <p class="empty-cart">
                Your cart is empty. Add something delicious from the menu!
            </p>
        `;
    }

    return cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-details">
                <h4>${escapeHTML(item.name)}</h4>
                <p>${formatPrice(item.price)} each</p>
                <strong>${formatPrice(item.price * item.quantity)}</strong>
            </div>

            <div class="quantity-controls">
                <button type="button"
                    ${actionAttribute}="decrease"
                    data-index="${index}">−</button>

                <span>${item.quantity}</span>

                <button type="button"
                    ${actionAttribute}="increase"
                    data-index="${index}">+</button>
            </div>

            <button type="button"
                class="remove-item"
                ${actionAttribute}="remove"
                data-index="${index}">
                Remove
            </button>
        </div>
    `).join("");
}

function renderCart() {
    const cartItems = document.querySelector("#cartItems");

    if (!cartItems) return;

    const { count, subtotal, discount, total } = getCartTotals();

    cartItems.innerHTML = renderCartItemsHTML();

    document.querySelector("#cartCount").textContent = count;
    document.querySelector("#cartSubtotal").textContent = formatPrice(subtotal);
    document.querySelector("#cartDiscount").textContent =
        "−" + formatPrice(discount);

    document.querySelector("#cartTotal").textContent = formatPrice(total);

    document.querySelector("#discountMessage").textContent =
        discount > 0
            ? "Great! 10% discount applied to your order."
            : `Add items worth ${formatPrice(Math.max(0, 799 - subtotal))} more to unlock 10% off.`;

    document.querySelector("#placeOrder").disabled = cart.length === 0;
}

function renderDrawerCart(lastAddedName = "") {
    const drawerItems = document.querySelector("#drawerCartItems");

    if (!drawerItems) return;

    const { count, subtotal, discount, total } = getCartTotals();

    document.querySelector("#drawerCartCount").textContent = count;
    document.querySelector("#floatingCartCount").textContent = count;
    document.querySelector("#drawerSubtotal").textContent = formatPrice(subtotal);
    document.querySelector("#drawerTotal").textContent = formatPrice(total);

    document.querySelector("#drawerDiscount").textContent =
        discount > 0
            ? `You saved ${formatPrice(discount)} with your 10% offer!`
            : `Add ${formatPrice(Math.max(0, 799 - subtotal))} more to get 10% off.`;

    const success = document.querySelector("#drawerSuccess");

    if (lastAddedName) {
        document.querySelector("#drawerSuccessText").textContent =
            `${lastAddedName} has been added to your cart.`;

        success.classList.add("visible");
    } else {
        success.classList.remove("visible");
    }

    if (cart.length === 0) {
        drawerItems.innerHTML = `
            <p class="drawer-empty">
                Your cart is empty. Add a favourite from the menu!
            </p>
        `;
    } else {
        drawerItems.innerHTML = cart.map((item, index) => `
            <div class="drawer-item">
                <div class="drawer-item-info">
                    <strong>${escapeHTML(item.name)}</strong>
                    <small>${formatPrice(item.price)} each</small>
                    <b>${formatPrice(item.price * item.quantity)}</b>
                </div>

                <div class="drawer-item-actions">
                    <div class="drawer-quantity">
                        <button type="button"
                            data-drawer-action="decrease"
                            data-index="${index}">−</button>

                        <span>${item.quantity}</span>

                        <button type="button"
                            data-drawer-action="increase"
                            data-index="${index}">+</button>
                    </div>

                    <button type="button"
                        class="drawer-remove"
                        data-drawer-action="remove"
                        data-index="${index}">
                        Remove
                    </button>
                </div>
            </div>
        `).join("");
    }
}

function setupCart() {
    document.querySelectorAll(".menu-item").forEach(item => {
        const name = item.querySelector("h3")?.textContent.trim();
        const priceText = item.querySelector("strong")?.textContent || "";
        const price = Number(priceText.replace(/[^\d.]/g, ""));

        if (
            !name ||
            !Number.isFinite(price) ||
            price <= 0 ||
            item.querySelector(".add-cart-btn")
        ) return;

        const button = document.createElement("button");

        button.type = "button";
        button.className = "add-cart-btn";
        button.textContent = "Add to Cart";

        button.addEventListener("click", () => {
            addToCart(name, price);
        });

        item.appendChild(button);
    });

    document.querySelectorAll(".combo-card").forEach(card => {
        const name = card.querySelector("h3")?.textContent.trim();
        const priceText =
            card.querySelector(".price-line strong")?.textContent || "";

        const price = Number(priceText.replace(/[^\d.]/g, ""));
        const info = card.querySelector(".combo-info");

        if (
            !name ||
            !Number.isFinite(price) ||
            price <= 0 ||
            !info ||
            info.querySelector(".add-cart-btn")
        ) return;

        const button = document.createElement("button");

        button.type = "button";
        button.className = "add-cart-btn";
        button.textContent = "Add Combo to Cart";

        button.addEventListener("click", () => {
            addToCart(name + " Combo", price);
        });

        info.appendChild(button);
    });

    const menuSection = document.querySelector(".menu-section");

    if (!menuSection) return;

    const cartSection = document.createElement("section");

    cartSection.className = "cart-section";
    cartSection.id = "shopping-cart";

    cartSection.innerHTML = `
        <div class="cart-heading">
            <p class="eyebrow">YOUR SELECTION</p>
            <h2>Your Shopping <span>Cart</span></h2>
            <p>Review your items, change quantities and check your total bill.</p>
        </div>

        <div class="cart-layout">
            <div class="cart-products">
                <div class="cart-title-row">
                    <h3>Cart Items</h3>
                    <span><span id="cartCount">0</span> items</span>
                </div>

                <div id="cartItems"></div>
            </div>

            <div class="bill-card">
                <h3>Order Summary</h3>

                <div class="bill-row">
                    <span>Subtotal</span>
                    <strong id="cartSubtotal">₹0.00</strong>
                </div>

                <div class="bill-row">
                    <span>Offer discount (10%)</span>
                    <strong class="cart-discount" id="cartDiscount">−₹0.00</strong>
                </div>

                <p id="discountMessage" class="coupon-note">
                    Add items worth ₹799 to unlock 10% off.
                </p>

                <div class="bill-row bill-total">
                    <span>Total Bill</span>
                    <strong id="cartTotal">₹0.00</strong>
                </div>

                <button type="button"
                    class="btn place-order-btn"
                    id="placeOrder"
                    disabled>
                    Place Order
                </button>

                <p class="bill-note">
                    Demo checkout only. No real payment will be collected.
                </p>

                <p id="orderMessage" class="order-message" aria-live="polite"></p>
            </div>
        </div>
    `;

    menuSection.after(cartSection);

    document.querySelector("#cartItems").addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const index = Number(button.dataset.index);

        if (button.dataset.action === "increase") changeQuantity(index, 1);
        if (button.dataset.action === "decrease") changeQuantity(index, -1);
        if (button.dataset.action === "remove") removeFromCart(index);
    });

    document.querySelector("#placeOrder").addEventListener("click", () => {
        if (!cart.length) return;

        const orderNumber = "BB" + Date.now().toString().slice(-6);

        document.querySelector("#orderMessage").textContent =
            `Order ${orderNumber} placed successfully! Thank you for choosing Brew & Bloom.`;

        cart = [];

        saveCart();
        renderCart();
        renderDrawerCart();
        closeCartDrawer();
    });

    createCartInterface();
    renderCart();
    renderDrawerCart();
}

if (document.querySelector(".menu-section")) {
    setupCart();
}
