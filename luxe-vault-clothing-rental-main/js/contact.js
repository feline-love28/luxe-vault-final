/**
 * Luxe Vault - Contact form: sends the message to the backend (saved in MySQL)
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const alertBox = document.getElementById('contact-alert');
        const submitBtn = form.querySelector('button[type="submit"]');

        const formData = {
            name: document.getElementById('contact-name').value.trim(),
            email: document.getElementById('contact-email').value.trim(),
            subject: document.getElementById('contact-subject').value.trim(),
            message: document.getElementById('contact-message').value.trim()
        };

        if (!formData.name || !formData.email || !formData.message) {
            showAuthAlert(alertBox, "Please fill in your name, email and message.", "danger");
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
            hideAuthAlert(alertBox);

            const result = await apiService.contact.send(formData);

            showAuthAlert(alertBox, result.message, "success");
            form.reset();
        } catch (err) {
            showAuthAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Send Message";
        }
    });
});

// Same alert helpers as auth.js (this page does not load auth.js)
function showAuthAlert(el, message, type) {
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.style.display = 'block';
}

function hideAuthAlert(el) {
    if (!el) return;
    el.style.display = 'none';
}
