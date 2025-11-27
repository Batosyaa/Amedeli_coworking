const SUPABASE_URL = 'https://ppjbczfdcrsmikpbxfcm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwamJjemZkY3JzbWlrcGJ4ZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU5MTEsImV4cCI6MjA3ODAzMTkxMX0.0Rl6Nu2Ha9Ht1qdn38FTolB9SyhBwMpMuelVupHM2Zg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let bookingData = null;
let timerInterval = null;

function loadBookingData() {
    const data = sessionStorage.getItem('pendingBooking');
    if (!data) {
        alert('Данные бронирования не найдены');
        window.location.href = 'index.html';
        return;
    }

    bookingData = JSON.parse(data);
    displayBookingInfo();
    startTimer();
}

function displayBookingInfo() {
    document.getElementById('bookingNumber').textContent = `Бронирование: ${bookingData.bookingNumber}`;
            
    const bookingInfo = `
        <div class="info-row">
            <span class="info-label">Комната:</span>
            <span class="info-value">${bookingData.roomName}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Дата:</span>
            <span class="info-value">${bookingData.bookingDate}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Время:</span>
            <span class="info-value">${bookingData.timeRange}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Общая стоимость:</span>
            <span class="info-value">${bookingData.totalCost.toLocaleString()}₸</span>
        </div>
        <div class="info-row">
            <span class="info-label">Предоплата (50%):</span>
            <span class="info-value">${bookingData.depositAmount.toLocaleString()}₸</span>
        </div>
        <div class="info-row">
            <span class="info-label">К оплате на месте:</span>
            <span class="info-value">${bookingData.remainingAmount.toLocaleString()}₸</span>
        </div>
    `;
            
    document.getElementById('bookingInfo').innerHTML = bookingInfo;
    document.getElementById('amountText').textContent = `${bookingData.depositAmount.toLocaleString()}₸`;
    document.getElementById('commentText').textContent = bookingData.bookingNumber;
}

function startTimer() {
    const expiresAt = new Date(bookingData.expiresAt);
            
    timerInterval = setInterval(() => {
        const now = new Date();
        const diff = expiresAt - now;
        
        if (diff <= 0) {
            clearInterval(timerInterval);
            expireBooking();
            return;
        }
                
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
                
        const timerEl = document.getElementById('timer');
        timerEl.textContent = `⏱️ Осталось: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                
        if (minutes < 5) {
            timerEl.style.color = 'var(--error)';
        }
    }, 1000);
}

async function expireBooking() {
    alert('Время оплаты истекло. Бронирование отменено.');
            
    await supabase
        .from('bookings')
        .update({ 
            booking_status: 'cancelled',
            cancellation_reason: 'Payment timeout',
            cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingData.bookingId);
            
    sessionStorage.removeItem('pendingBooking');
    window.location.href = 'index.html';
}

// Confirm payment
async function confirmPayment() {
    if (!confirm('Вы подтверждаете, что оплата прошла успешно?')) {
        return;
    }

    try {
        // Soon we will make an approval system via Kaspi API, for now we just set status to 'verifying'
                
        const { error } = await supabase
            .from('bookings')
            .update({ 
                payment_status: 'verifying',
                booking_status: 'pending'
            })
            .eq('id', bookingData.bookingId);

        if (error) throw error;

        alert('Спасибо! Ваша оплата принята на проверку.\n\nМы проверим платеж и свяжемся с вами в WhatsApp в течение 5 минут.');
                
        const whatsappMessage = encodeURIComponent(
            `Здравствуйте! Я оплатил бронирование ${bookingData.bookingNumber}. Сумма: ${bookingData.depositAmount}₸`
        );
        window.open(`https://wa.me/77076133843?text=${whatsappMessage}`, '_blank');
                
        sessionStorage.removeItem('pendingBooking');
        window.location.href = 'index.html';
                
    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка при подтверждении оплаты. Пожалуйста, свяжитесь с нами напрямую.');
    }
}

async function cancelBooking() {
    if (!confirm('Вы уверены, что хотите отменить бронирование?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('bookings')
            .update({ 
                booking_status: 'cancelled',
                cancellation_reason: 'Cancelled by user',
                cancelled_at: new Date().toISOString()
            })
            .eq('id', bookingData.bookingId);

        if (error) throw error;

        alert('Бронирование отменено');
        sessionStorage.removeItem('pendingBooking');
        window.location.href = 'index.html';
                
    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка при отмене бронирования');
    }
}

document.addEventListener('DOMContentLoaded', loadBookingData);