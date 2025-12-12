const ADMIN_PASSWORD = 'AmideliHub2025!';
const SUPABASE_URL = 'https://ppjbczfdcrsmikpbxfcm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwamJjemZkY3JzbWlrcGJ4ZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU5MTEsImV4cCI6MjA3ODAzMTkxMX0.0Rl6Nu2Ha9Ht1qdn38FTolB9SyhBwMpMuelVupHM2Zg';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

let allBookings = [];
let refreshInterval;

document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const password = document.getElementById('passwordInput').value;

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadBookings();
        startAutoRefresh();
    } else {
        document.getElementById('loginError').classList.add('show');
        setTimeout(() => {
            document.getElementById('loginError').classList.remove('show');
        }, 3000);
    }
});

if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadBookings();
    startAutoRefresh();
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    stopAutoRefresh();
    location.reload();
}

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadBookings(true);
    }, 30000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

function showRefreshIndicator() {
    const indicator = document.getElementById('refreshIndicator');
    indicator.classList.add('show');
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

async function loadBookings(isAutoRefresh = false) {
    try {
        const { data, error } = await supabaseClient
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allBookings = data || [];

        if (isAutoRefresh) {
            showRefreshIndicator();
        }

        updateStats();
        displayPendingBookings();
        displayConfirmedBookings();
        displayCancelledBookings();

    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

function updateStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const pending = allBookings.filter(b => b.payment_status === 'pending' || b.payment_status === 'verifying').length;
    const confirmedToday = allBookings.filter(b =>
        b.booking_status === 'confirmed' &&
        b.booking_date === today
    ).length;

    const weekRevenue = allBookings
        .filter(b =>
            b.booking_status === 'confirmed' &&
            new Date(b.created_at) >= weekAgo
        )
        .reduce((sum, b) => sum + (b.total_cost || 0), 0);

    document.getElementById('statPending').textContent = pending;
    document.getElementById('statConfirmed').textContent = confirmedToday;
    document.getElementById('statRevenue').textContent = weekRevenue.toLocaleString() + '₸';
    document.getElementById('statTotal').textContent = allBookings.length;
}

function displayPendingBookings() {
    const pending = allBookings.filter(b =>
        b.payment_status === 'pending' || b.payment_status === 'verifying'
    );

    document.getElementById('pendingCount').textContent = pending.length;

    const container = document.getElementById('pendingBookings');

    if (pending.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <p>Нет ожидающих бронирований</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = pending.map(booking => `
                <div class="booking-card pending">
                    <div class="booking-header">
                        <div class="booking-number">${booking.booking_number}</div>
                        ${getTimerHTML(booking.payment_expires_at)}
                    </div>
                    <div class="booking-info">
                        <div class="info-item">
                            <div class="info-label">Клиент</div>
                            <div class="info-value">${booking.client_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Телефон</div>
                            <div class="info-value">
                                <a href="https://wa.me/${booking.client_phone.replace(/\D/g, '')}" target="_blank">
                                    ${booking.client_phone}
                                </a>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Комната</div>
                            <div class="info-value">${booking.room_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Дата и время</div>
                            <div class="info-value">${formatDate(booking.booking_date)}, ${booking.start_time}-${booking.end_time}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Гости</div>
                            <div class="info-value">${booking.guest_count} чел.</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Предоплата</div>
                            <div class="info-value">${booking.deposit_amount.toLocaleString()}₸</div>
                        </div>
                    </div>
                    ${booking.menu_preorder ? `
                        <div style="margin: 1rem 0; padding: 1rem; background: white; border-radius: 10px;">
                            <strong>Предзаказ:</strong> ${Array.isArray(booking.menu_preorder) ? booking.menu_preorder.join(', ') : booking.menu_preorder}
                        </div>
                    ` : ''}
                    ${booking.additional_notes ? `
                        <div style="margin: 1rem 0; padding: 1rem; background: white; border-radius: 10px;">
                            <strong>Примечания:</strong> ${booking.additional_notes}
                        </div>
                    ` : ''}
                    <div class="booking-actions">
                        <button class="btn btn-success btn-small" onclick="confirmPayment('${booking.id}')">
                            ✓ Подтвердить оплату
                        </button>
                        <button class="btn btn-danger btn-small" onclick="rejectBooking('${booking.id}')">
                            ✗ Отклонить
                        </button>
                    </div>
                </div>
            `).join('');

    updateTimers();
}

function displayConfirmedBookings() {
    const confirmed = allBookings.filter(b => b.booking_status === 'confirmed');

    const container = document.getElementById('confirmedBookings');

    if (confirmed.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <p>Нет подтвержденных бронирований</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = confirmed.map(booking => `
                <div class="booking-card confirmed">
                    <div class="booking-header">
                        <div class="booking-number">${booking.booking_number}</div>
                        <div style="background: ${getStatusColor(booking.booking_status)}; color: white; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.9rem;">
                            ✓ Подтверждено
                        </div>
                    </div>
                    <div class="booking-info">
                        <div class="info-item">
                            <div class="info-label">Клиент</div>
                            <div class="info-value">${booking.client_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Телефон</div>
                            <div class="info-value">
                                <a href="https://wa.me/${booking.client_phone.replace(/\D/g, '')}" target="_blank">
                                    ${booking.client_phone}
                                </a>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Комната</div>
                            <div class="info-value">${booking.room_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Дата и время</div>
                            <div class="info-value">${formatDate(booking.booking_date)}, ${booking.start_time}-${booking.end_time}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Стоимость</div>
                            <div class="info-value">${booking.total_cost.toLocaleString()}₸</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Осталось оплатить</div>
                            <div class="info-value">${booking.remaining_amount.toLocaleString()}₸</div>
                        </div>
                    </div>
                    ${booking.menu_preorder ? `
                        <div style="margin: 1rem 0; padding: 1rem; background: white; border-radius: 10px;">
                            <strong>Предзаказ:</strong> ${Array.isArray(booking.menu_preorder) ? booking.menu_preorder.join(', ') : booking.menu_preorder}
                        </div>
                    ` : ''}
                    <div class="booking-actions">
                        <button class="btn btn-danger btn-small" onclick="cancelBooking('${booking.id}')">
                            ❌ Отменить бронирование
                        </button>
                        ${!booking.has_been_rearranged ? `
                            <button class="btn btn-warning btn-small" onclick="rearrangeBooking('${booking.id}')">
                                🔄 Перенести (1 раз)
                            </button>
                        ` : '<span style="color: gray;">✓ Уже переносилось</span>'}
                    </div>
                </div>
            `).join('');
}

function displayCancelledBookings() {
    const cancelled = allBookings.filter(b => b.booking_status === 'cancelled');

    const container = document.getElementById('cancelledBookings');

    if (cancelled.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <p>Нет отмененных бронирований</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = cancelled.slice(0, 10).map(booking => `
                <div class="booking-card cancelled">
                    <div class="booking-header">
                        <div class="booking-number">${booking.booking_number}</div>
                    </div>
                    <div class="booking-info">
                        <div class="info-item">
                            <div class="info-label">Клиент</div>
                            <div class="info-value">${booking.client_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Дата</div>
                            <div class="info-value">${formatDate(booking.booking_date)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Причина</div>
                            <div class="info-value">${booking.cancellation_reason || 'Не указана'}</div>
                        </div>
                    </div>
                </div>
            `).join('');
}

async function confirmPayment(bookingId) {
    if (!confirm('Подтвердить оплату?')) return;

    try {
        const { error } = await supabaseClient
            .from('bookings')
            .update({
                payment_status: 'paid',
                booking_status: 'confirmed',
                paid_at: new Date().toISOString(),
                confirmed_at: new Date().toISOString()
            })
            .eq('id', bookingId);

        if (error) throw error;

        await supabaseClient
            .from('payment_confirmations')
            .insert([{
                booking_id: bookingId,
                confirmed_by: 'Admin',
                confirmation_notes: 'Manual confirmation'
            }]);

        alert('✅ Оплата подтверждена!');
        loadBookings();

    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка при подтверждении оплаты');
    }
}

async function rejectBooking(bookingId) {
    const reason = prompt('Причина отклонения:');
    if (!reason) return;

    try {
        const { error } = await supabaseClient
            .from('bookings')
            .update({
                booking_status: 'cancelled',
                payment_status: 'failed',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'Admin'
            })
            .eq('id', bookingId);

        if (error) throw error;

        alert('❌ Бронирование отклонено');
        loadBookings();

    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка при отклонении');
    }
}

async function cancelBooking(bookingId) {
    const reason = prompt('Причина отмены (обязательно):');
    if (!reason) return;

    if (!confirm('⚠️ ВНИМАНИЕ: Отменить подтвержденное бронирование? Возврат средств НЕ производится!')) return;

    try {
        const { error } = await supabaseClient
            .from('bookings')
            .update({
                booking_status: 'cancelled',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
                cancelled_by: 'Admin'
            })
            .eq('id', bookingId);

        if (error) throw error;

        alert('❌ Бронирование отменено (без возврата средств)');
        loadBookings();

    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка при отмене');
    }
}

async function rearrangeBooking(bookingId) {
    alert('⚠️ Функция переноса:\n\n1. Свяжитесь с клиентом\n2. Согласуйте новое время\n3. Создайте новое бронирование\n4. Отметьте это как перенесенное');

    const confirm = window.confirm('Отметить бронирование как перенесенное?');
    if (!confirm) return;

    try {
        const { error } = await supabaseClient
            .from('bookings')
            .update({
                has_been_rearranged: true
            })
            .eq('id', bookingId);

        if (error) throw error;

        alert('✅ Отмечено как перенесенное');
        loadBookings();

    } catch (error) {
        console.error('Error:', error);
        alert('Ошибка');
    }
}

function getTimerHTML(expiresAt) {
    if (!expiresAt) return '';

    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) {
        return '<div class="booking-timer" style="background: gray;">⏰ Истекло</div>';
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `<div class="booking-timer" data-expires="${expiresAt}">⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}</div>`;
}

function updateTimers() {
    setInterval(() => {
        document.querySelectorAll('[data-expires]').forEach(timer => {
            const expiresAt = timer.getAttribute('data-expires');
            const now = new Date();
            const expires = new Date(expiresAt);
            const diff = expires - now;

            if (diff <= 0) {
                timer.textContent = '⏰ Истекло';
                timer.style.background = 'gray';
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                timer.textContent = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        });
    }, 1000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

function getStatusColor(status) {
    switch (status) {
        case 'confirmed': return '#4CAF50';
        case 'pending': return '#FF9800';
        case 'cancelled': return '#f44336';
        default: return '#2196F3';
    }
}

function filterBookings() {
    const roomFilter = document.getElementById('filterRoom').value;
    const dateFilter = document.getElementById('filterDate').value;

    let filtered = allBookings.filter(b => b.booking_status === 'confirmed');

    if (roomFilter) {
        filtered = filtered.filter(b => b.room_type === roomFilter);
    }

    if (dateFilter) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateFilter) {
            case 'today':
                filtered = filtered.filter(b => {
                    const bookingDate = new Date(b.booking_date);
                    return bookingDate.toDateString() === today.toDateString();
                });
                break;
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filtered = filtered.filter(b => {
                    const bookingDate = new Date(b.booking_date);
                    return bookingDate.toDateString() === tomorrow.toDateString();
                });
                break;
            case 'week':
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                filtered = filtered.filter(b => {
                    const bookingDate = new Date(b.booking_date);
                    return bookingDate >= today && bookingDate <= weekEnd;
                });
                break;
        }
    }

    const container = document.getElementById('confirmedBookings');

    if (filtered.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔍</div>
                        <p>Нет результатов по выбранным фильтрам</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = filtered.map(booking => `
                <div class="booking-card confirmed">
                    <div class="booking-header">
                        <div class="booking-number">${booking.booking_number}</div>
                        <div style="background: ${getStatusColor(booking.booking_status)}; color: white; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.9rem;">
                            ✓ Подтверждено
                        </div>
                    </div>
                    <div class="booking-info">
                        <div class="info-item">
                            <div class="info-label">Клиент</div>
                            <div class="info-value">${booking.client_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Телефон</div>
                            <div class="info-value">
                                <a href="https://wa.me/${booking.client_phone.replace(/\D/g, '')}" target="_blank">
                                    ${booking.client_phone}
                                </a>
                            </div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Комната</div>
                            <div class="info-value">${booking.room_name}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Дата и время</div>
                            <div class="info-value">${formatDate(booking.booking_date)}, ${booking.start_time}-${booking.end_time}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Стоимость</div>
                            <div class="info-value">${booking.total_cost.toLocaleString()}₸</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Осталось оплатить</div>
                            <div class="info-value">${booking.remaining_amount.toLocaleString()}₸</div>
                        </div>
                    </div>
                    ${booking.menu_preorder ? `
                        <div style="margin: 1rem 0; padding: 1rem; background: white; border-radius: 10px;">
                            <strong>Предзаказ:</strong> ${Array.isArray(booking.menu_preorder) ? booking.menu_preorder.join(', ') : booking.menu_preorder}
                        </div>
                    ` : ''}
                    <div class="booking-actions">
                        <button class="btn btn-danger btn-small" onclick="cancelBooking('${booking.id}')">
                            ❌ Отменить бронирование
                        </button>
                        ${!booking.has_been_rearranged ? `
                            <button class="btn btn-warning btn-small" onclick="rearrangeBooking('${booking.id}')">
                                🔄 Перенести (1 раз)
                            </button>
                        ` : '<span style="color: gray;">✓ Уже переносилось</span>'}
                    </div>
                </div>
            `).join('');
}

// Admin Booking Logic

let selectedRoom = 'conference';
let selectedSlots = [];
const roomData = {
    conference: { name: 'Конференц-зал', price: 10000 },
    studio: { name: 'Контент-студия', price: 10000 },
    'meeting-a': { name: 'Переговорная A', price: 3000 },
    'meeting-b': { name: 'Переговорная B', price: 3000 },
    'meeting-c': { name: 'Переговорная C', price: 3000 },
    'meeting-d': { name: 'Переговорная D', price: 3000 },
    'workspace-1': { name: 'Рабочее место 1', price: 1000 },
    'workspace-2': { name: 'Рабочее место 2', price: 1000 },
    'workspace-3': { name: 'Рабочее место 3', price: 1000 },
    'workspace-4': { name: 'Рабочее место 4', price: 1000 },
    'workspace-5': { name: 'Рабочее место 5', price: 1000 }
};

function openNewBookingModal() {
    document.getElementById('bookingModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Новое бронирование';
    document.getElementById('adminBookingForm').reset();
    document.getElementById('editingBookingId').value = '';
    selectedSlots = [];
    updateSelectedSlots();
    generateTimetable();

    setTimeout(setupPhoneInput, 100);
}

function setupPhoneInput() {
    const phoneInput = document.getElementById('clientPhone');

    if (!phoneInput) return;

    phoneInput.addEventListener('focus', function() {
        if (phoneInput.value === '') {
            phoneInput.value = '+7 ';
        }
    });

    phoneInput.addEventListener('input', function(e) {
        let val = phoneInput.value.replace(/\D/g, '');

        if (val.startsWith('7')) val = val.slice(1);
        if (val.startsWith('8')) val = val.slice(1);
        if (val.length > 10) val = val.slice(0, 10);

        let formatted = '+7';
        if (val.length > 0) formatted += ' (' + val.slice(0, 3);
        if (val.length >= 3) formatted += ') ' + val.slice(3, 6);
        if (val.length >= 6) formatted += '-' + val.slice(6, 8);
        if (val.length >= 8) formatted += '-' + val.slice(8, 10);

        phoneInput.value = formatted;
    });

    phoneInput.addEventListener('keydown', function(e) {
        const cursorPos = phoneInput.selectionStart;
        const cursorEnd = phoneInput.selectionEnd;
        
        if (e.key === 'Backspace' && cursorPos <= 3 && cursorEnd <= 3) {
            e.preventDefault();
        }
        if (e.key === 'Delete' && cursorPos < 3) {
            e.preventDefault();
        }
        if (e.key === 'ArrowLeft' && cursorPos <= 3) {
            e.preventDefault();
        }
    });

    phoneInput.addEventListener('blur', function() {
        const digitsOnly = phoneInput.value.replace(/\D/g, '');

        if (digitsOnly.length > 0 && digitsOnly.length < 11) {
            alert('Пожалуйста, введите полный номер телефона (10 цифр).');
            phoneInput.value = '';
        }
        
        if (phoneInput.value === '+7 ' || phoneInput.value === '+7') {
            phoneInput.value = '';
        }
    });

    phoneInput.addEventListener('paste', function(e) {
        e.preventDefault();

        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pastedText.replace(/\D/g, '');

        let cleanDigits = digits;
        if (cleanDigits.startsWith('7')) cleanDigits = cleanDigits.slice(1);
        if (cleanDigits.startsWith('8')) cleanDigits = cleanDigits.slice(1);
        cleanDigits = cleanDigits.slice(0, 10);

        if (cleanDigits.length > 0) {
            let formatted = '+7';
            if (cleanDigits.length > 0) formatted += ' (' + cleanDigits.slice(0, 3);
            if (cleanDigits.length >= 3) formatted += ') ' + cleanDigits.slice(3, 6);
            if (cleanDigits.length >= 6) formatted += '-' + cleanDigits.slice(6, 8);
            if (cleanDigits.length >= 8) formatted += '-' + cleanDigits.slice(8, 10);
            
            phoneInput.value = formatted;
        }
    });
}


function closeModal() {
    document.getElementById('bookingModal').style.display = 'none';
}

window.onclick = function (event) {
    const modal = document.getElementById('bookingModal');
    if (event.target == modal) {
        closeModal();
    }
}

function selectRoom(room) {
    selectedRoom = room;
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    generateTimetable();
}

async function generateTimetable() {
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '<div class="loading">Загрузка расписания...</div>';

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);

        const { data: bookings, error } = await supabaseClient
            .from('bookings')
            .select('booking_date, time_slots')
            .eq('room_type', selectedRoom)
            .gte('booking_date', today.toISOString().split('T')[0])
            .lte('booking_date', endDate.toISOString().split('T')[0])
            .in('booking_status', ['confirmed', 'pending']);

        if (error) throw error;

        const bookedSlots = new Map();
        if (bookings) {
            bookings.forEach(booking => {
                if (booking.time_slots) {
                    booking.time_slots.forEach(slot => {
                        bookedSlots.set(`${booking.booking_date}-${slot.hour}`, true);
                    });
                }
            });
        }

        grid.innerHTML = '';
        const daysArray = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            daysArray.push(date);
        }

        grid.style.gridTemplateColumns = `80px repeat(${daysArray.length}, 100px)`;

        const timeHeader = document.createElement('div');
        timeHeader.className = 'time-header';
        timeHeader.textContent = 'Время';
        grid.appendChild(timeHeader);

        daysArray.forEach(date => {
            const cell = document.createElement('div');
            cell.className = 'day-header';
            const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
            const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });
            cell.innerHTML = `${dayName}<br><small>${dateStr}</small>`;
            
            if (date.toDateString() === today.toDateString()) {
                cell.style.background = '#c9a961';
                cell.style.color = '#1a1612';
                cell.style.fontWeight = '700';
            }
            
            grid.appendChild(cell);
        });

        const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

        hours.forEach(hour => {
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-header';
            timeLabel.textContent = hour;
            grid.appendChild(timeLabel);

            daysArray.forEach(date => {
                const dateStr = date.toISOString().split('T')[0];
                const slotKey = `${dateStr}-${hour}`;
                const isBooked = bookedSlots.has(slotKey);

                const slot = document.createElement('div');
                slot.className = 'time-slot';
                slot.dataset.date = dateStr;
                slot.dataset.hour = hour;

                const slotDateTime = new Date(date);
                const [slotHour] = hour.split(':');
                slotDateTime.setHours(parseInt(slotHour), 0, 0, 0);
                const now = new Date();

                if (slotDateTime < now) {
                    slot.classList.add('past');
                    slot.style.background = '#E0E0E0';
                    slot.style.cursor = 'not-allowed';
                    slot.style.opacity = '0.5';
                    slot.title = 'Время прошло'; // I'm not so sure about this title, but let's check it
                } else if (isBooked) {
                    slot.classList.add('booked');
                    slot.title = 'Занято';
                } else {
                    slot.classList.add('available');
                    if (selectedSlots.some(s => s.day === dateStr && s.hour === hour && s.room === selectedRoom)) {
                        slot.classList.add('selected');
                    }

                    slot.onclick = function () {
                        this.classList.toggle('selected');
                        updateSelectedSlots();
                    };
                }
                grid.appendChild(slot);
            });
        });

    } catch (error) {
        console.error('Error generating timetable:', error);
        grid.innerHTML = 'Ошибка загрузки';
    }
}

function updateSelectedSlots() {
    selectedSlots = [];
    document.querySelectorAll('.time-slot.selected').forEach(slot => {
        selectedSlots.push({
            day: slot.dataset.date,
            hour: slot.dataset.hour,
            room: selectedRoom
        });
    });

    selectedSlots.sort((a, b) => {
        if (a.day !== b.day) return a.day.localeCompare(b.day);
        return a.hour.localeCompare(b.hour);
    });

    const summary = selectedSlots.map(s => {
        const date = new Date(s.day);
        return `${date.getDate()}.${date.getMonth() + 1} ${s.hour}`;
    }).join(', ');

    document.getElementById('selectedTime').value = summary || 'Не выбрано';
}

document.getElementById('adminBookingForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const clientName = document.getElementById('clientName').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const guestCount = document.getElementById('guestCount').value;
    const notes = document.getElementById('additionalNotes').value;
    const editingId = document.getElementById('editingBookingId').value;

    if (selectedSlots.length === 0) {
        alert('Выберите время!');
        return;
    }

    // Calculate cost (simplified for admin)
    let totalCost = 0;
    selectedSlots.forEach(slot => {
        const hour = parseInt(slot.hour.split(':')[0]);
        let price = roomData[selectedRoom].price;
        if (selectedRoom === 'studio' && hour >= 19) {
            // Assuming that the edit is manual, there's no need in this logic
        }
        totalCost += price;
    });

    const bookingData = {
        room_type: selectedRoom,
        room_name: roomData[selectedRoom].name,
        client_name: clientName,
        client_phone: clientPhone,
        guest_count: parseInt(guestCount),
        booking_date: selectedSlots[0].day,
        start_time: selectedSlots[0].hour,
        end_time: selectedSlots[selectedSlots.length - 1].hour,
        time_slots: selectedSlots,
        total_cost: totalCost,
        remaining_amount: 0,
        deposit_amount: totalCost,
        additional_notes: notes,
        booking_status: 'confirmed',
        payment_status: 'admin_created',
        confirmed_at: new Date().toISOString()
    };

    try {
        let error;
        if (editingId) {
            const { error: updateError } = await supabaseClient
                .from('bookings')
                .update(bookingData)
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabaseClient
                .from('bookings')
                .insert([bookingData]);
            error = insertError;
        }

        if (error) throw error;

        alert('Бронирование сохранено!');
        closeModal();
        loadBookings();

    } catch (err) {
        console.error('Error saving booking:', err);
        alert('Ошибка при сохранении: ' + err.message);
    }
});

const originalDisplayConfirmed = displayConfirmedBookings;
displayConfirmedBookings = function () {
    const confirmed = allBookings.filter(b => b.booking_status === 'confirmed');
    const container = document.getElementById('confirmedBookings');

    if (confirmed.length === 0) {
        container.innerHTML = `
                     <div class="empty-state">
                         <div class="empty-state-icon">📭</div>
                         <p>Нет подтвержденных бронирований</p>
                     </div>
                 `;
        return;
    }

    container.innerHTML = confirmed.map(booking => `
                 <div class="booking-card confirmed">
                     <div class="booking-header">
                         <div class="booking-number">${booking.booking_number}</div>
                         <div style="background: ${getStatusColor(booking.booking_status)}; color: white; padding: 0.5rem 1rem; border-radius: 10px; font-size: 0.9rem;">
                             ✓ Подтверждено
                         </div>
                     </div>
                     <div class="booking-info">
                         <div class="info-item">
                             <div class="info-label">Клиент</div>
                             <div class="info-value">${booking.client_name}</div>
                         </div>
                         <div class="info-item">
                             <div class="info-label">Телефон</div>
                             <div class="info-value">
                                 <a href="https://wa.me/${booking.client_phone.replace(/\D/g, '')}" target="_blank">
                                     ${booking.client_phone}
                                 </a>
                             </div>
                         </div>
                         <div class="info-item">
                             <div class="info-label">Комната</div>
                             <div class="info-value">${booking.room_name}</div>
                         </div>
                         <div class="info-item">
                             <div class="info-label">Дата и время</div>
                             <div class="info-value">${formatDate(booking.booking_date)}, ${booking.start_time}-${booking.end_time}</div>
                         </div>
                         <div class="info-item">
                             <div class="info-label">Стоимость</div>
                             <div class="info-value">${booking.total_cost.toLocaleString()}₸</div>
                         </div>
                     </div>
                     ${booking.additional_notes ? `
                         <div style="margin: 1rem 0; padding: 1rem; background: white; border-radius: 10px;">
                             <strong>Примечания:</strong> ${booking.additional_notes}
                         </div>
                     ` : ''}
                     <div class="booking-actions">
                         <button class="btn btn-info btn-small" onclick="editBooking('${booking.id}')">
                             ✏️ Изменить
                         </button>
                         <button class="btn btn-danger btn-small" onclick="cancelBooking('${booking.id}')">
                             ❌ Отменить
                         </button>
                     </div>
                 </div>
             `).join('');
}

function editBooking(id) {
    const booking = allBookings.find(b => b.id === id);
    if (!booking) return;

    openNewBookingModal();
    document.getElementById('modalTitle').textContent = 'Редактирование бронирования';
    document.getElementById('editingBookingId').value = booking.id;
    document.getElementById('clientName').value = booking.client_name;
    document.getElementById('clientPhone').value = booking.client_phone;
    document.getElementById('guestCount').value = booking.guest_count;
    document.getElementById('additionalNotes').value = booking.additional_notes || '';

    selectedRoom = booking.room_type;
    document.querySelectorAll('.room-btn').forEach(btn => {
        if (btn.textContent.includes(roomData[selectedRoom].name) ||
            btn.onclick.toString().includes(selectedRoom)) { // heuristic
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    // Better way to select room button:
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${selectedRoom}'`)) {
            btn.classList.add('active');
        }
    });

    // Set slots
    selectedSlots = booking.time_slots || [];
    updateSelectedSlots();
    generateTimetable(); // Will mark selected slots

    setTimeout(setupPhoneInput, 100);
}