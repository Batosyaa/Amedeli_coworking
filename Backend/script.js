const EMAILJS_CONFIG = {
    publicKey: "ZGILo2gjELlAeN6yE",
    serviceID: "service_8gppcmh",
    templateID: "template_2506gz7"
}

emailjs.init(EMAILJS_CONFIG.publicKey);

AOS.init({
    duration: 800,
    once: true,
    offset: 100
});

let currentLang = 'ru';

function switchLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('[data-ru]').forEach(el => {
        el.textContent = el.getAttribute(`data-${lang}`);
    });
}

function toggleMobileMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.getElementById('navLinks').classList.remove('active');
        }
    });
});

let selectedRoom = 'conference';
let selectedSlots = [];
const roomData = {
    conference: { 
        name: { ru: 'Конференц-зал', kz: 'Конференц-зал', en: 'Conference Hall' },
        price: '10,000₸'
    },
    studio: { 
        name: { ru: 'Контент-студия', kz: 'Контент-студия', en: 'Content Studio' },
        price: '8,000₸ - 10,000₸'
    },
    meeting: { 
        name: { ru: 'Переговорная', kz: 'Келіссөз бөлмесі', en: 'Meeting Room' },
        price: '3,000₸'
    }
};

function selectRoom(room) {
    selectedRoom = room;
    document.querySelectorAll('.room-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('selectedRoom').value = roomData[room].name[currentLang];
    generateTimetable();
}

async function generateTimetable() {
    const days = {
        ru: ['Время', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        kz: ['Уақыт', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
        en: ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    };
    
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '';

    try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);

        const endOfWeek = new Date(monday);
        endOfWeek.setDate(monday.getDate() + 7);

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('booking_date, time_slots, room_type, booking_status')
            .eq('room_type', selectedRoom)
            .gte('booking_date', monday.toISOString().split('T')[0])
            .lte('booking_date', endOfWeek.toISOString().split('T')[0])
            .in('booking_status', ['confirmed', 'pending']);
        
        if (error) {
            console.error('Error fetching bookings: ', error);
            grid.innerHTML = '<div class="error-message">Непредвиденная ошибка. Попробуйте обновить страницу.</div>';
            return;
        }

    const bookedSlots = new Map();
    if (bookings) {
        bookings.forEach(booking => {
            const bookingDate = new Date(booking.booking_date);
            const dayIndex = (bookingDate.getDay() === 0 ? 7 : bookingDate.getDay());

            if (booking.time_slots && Array.isArray(booking.time_slots)) {
                booking.time_slots.forEach(slot => {
                    const key = `${dayIndex} - ${slot.hour}`;
                    bookedSlots.set(key, true);
                });
            }
        });
    }

    console.log(`Loaded ${bookings?.length || 0} bookings for ${selectedRoom}`);

    grid.innerHTML = '';

    days[currentLang].forEach((day, index) => {
        const cell = document.createElement('div');
        cell.className = index === 0 ? 'time-header' : 'day-header';
        cell.textContent = day;
        grid.appendChild(cell);
    });

    hours.forEach(hour => {
        const timeLabel = document.createelement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = hour;
        grid.appendChild(timeLabel);
    
        for (let day = 1; day <= 7; day++) {
            const slot = document.createElement('div');
            slot.classname = 'time-slot';
            slot.dataset.day = day;
            slot.dataset.hour = hour;
            slot.dataset.room = selectedRoom;

            const slotKey = `${day} - ${hour}`;
            const isBooked = bookedSlots.has(slotKey);

            if (isBooked) {
                slot.classList.add('booked');
            } else {
                slot.classList.add('available');
                slot.addEventListener('click', function() {
                    if (!this.classList.contains('booked')) {
                        this.classList.toggle('selected');
                        updateSelectedSlots();
                    }
                });
            }

            grid.appendChild(slot);
        } 
    });

    } catch (err) {
        console.error('Error generating timetable: ', err);
        grid.innerHTML = '<div class="loading">Ошибка загрузки расписания.</div>';
    }
}

function updateSelectedSlots() {
    selectedSlots = [];
    document.querySelectorAll('.time-slot.selected').forEach(slot => {
        selectedSlots.push({
            day: slot.dataset.day,
            hour: slot.dataset.hour,
            room: slot.dataset.room
        });
    });
    
    const days = {
        ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
        kz: ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'],
        en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    };
    
    const timeText = selectedSlots.map(slot => 
        `${days[currentLang][slot.day - 1]}, ${slot.hour}`
    ).join('; ');
    
    document.getElementById('selectedTime').value = timeText || (currentLang === 'ru' ? 'Не выбрано' : currentLang === 'kz' ? 'Таңдалмаған' : 'Not selected');
}

function generateMenuPreorder() {
    const menuItems = [
        { name: { ru: 'Американо', kz: 'Американо', en: 'Americano' }, price: '790₸' },
        { name: { ru: 'Капучино', kz: 'Капучино', en: 'Cappuccino' }, price: '990₸' },
        { name: { ru: 'Латте', kz: 'Латте', en: 'Latte' }, price: '990₸' },
        { name: { ru: 'Эспрессо', kz: 'Эспрессо', en: 'Espresso' }, price: '690₸' },
        { name: { ru: 'Черный чай', kz: 'Қара шай', en: 'Black Tea' }, price: '390₸' },
        { name: { ru: 'Зеленый чай', kz: 'Жасыл шай', en: 'Green Tea' }, price: '390₸' },
        { name: { ru: 'Мохито', kz: 'Мохито', en: 'Mojito' }, price: '1190₸' },
        { name: { ru: 'Цитрусовый лимонад', kz: 'Цитрустық лимонад', en: 'Citrus Lemonade' }, price: '1190₸' }
    ];

    const container = document.getElementById('menuPreorder');
    container.innerHTML = '';
    
    menuItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.innerHTML = `
            <input type="checkbox" id="menu_${index}" name="menu_preorder" value="${item.name.ru}">
            <label for="menu_${index}">${item.name[currentLang]} (${item.price})</label>
        `;
        container.appendChild(div);
    });
}

async function calculateBookingCost(roomType, timeSlots, menuItems) {
    try {
        const { data: room, error } = await supabase
        .from('rooms')
        .select('price_per_hour, price_after_7pm')
        .eq('room_type', roomType)
        .single();

        if (error) throw error;

        let roomCost = 0;
        timeSlots.forEach(slot => {
            const hour = parseInt(slot.hour.split(':')[0]);
            if (roomType == 'studio' && hour >= 19) {
                roomCost += room.price_after_7pm || room.price_per_hour;
            } else {
                roomCost += room.price_per_hour;
            }
        });

        let menuCost = 0;
        if (menuItems && menuItems.length > 0) {
            const {data: menuData} = await supabase
                .from('menu_items')
                .select('name_ru, price')
                .in('name_ru', menuItems);

            if (menuData) {
                menuData.forEach(item => {
                    menuCost += item.price;
                });
            }
        }

        const totalCost = roomCost + menuCost;
        const depositAmount = totalCost * 0.5;
        const remainingAmount = totalCost - depositAmount;

        return {
            roomCost,
            menuCost,
            totalCost,
            depositAmount: Math.round(depositAmount),
            remainingAmount: Math.round(remainingAmount),
            durationHours: timeSlots.length
        };
    } catch (err) {
        console.error('Error calculating booking cost: ', err);
        return null;
    }
}

document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('clientName').value,
        phone: document.getElementById('clientPhone').value,
        email: document.getElementById('clientEmail').value,
        guestCount: document.getElementById('guestCount').value,
        room: document.getElementById('selectedRoom').value,
        time: document.getElementById('selectedTime').value,
        notes: document.getElementById('additionalNotes').value,
        menu: Array.from(document.querySelectorAll('input[name="menu_preorder"]:checked'))
            .map(cb => cb.value).join(', ')
    };

    if (!formData.name || !formData.phone) {
        alert(currentLang === 'ru' ? 'Пожалуйста, заполните все обязательные поля' : 
              currentLang === 'kz' ? 'Барлық міндетті өрістерді толтырыңыз' : 
              'Please fill in all required fields');
        return;
    }

    if (selectedSlots.length === 0) {
        alert(currentLang === 'ru' ? 'Пожалуйста, выберите время' : 
              currentLang === 'kz' ? 'Уақытты таңдаңыз' : 
              'Please select time slots');
        return;
    }

    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = currentLang === 'ru' ? 'Отправка...' : 
                                   currentLang === 'kz' ? 'Жіберілуде...' : 
                                   'Sending...';

    try {
        const pricing = await calculateBookingCost(selectedRoom, selectedSlots, formData.menu);

        if (!pricing) throw new Error('Failed to calculate pricing.');

        console.log('Pricing calculated: ', pricing);

        const today = new Date();
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(monday.getDate() + mondayOffset);

        const firstSlot = selectedSlots[0];
        const bookingDate = new Date(monday);
        bookingDate.setDate(monday.getDate() + (parseInt(fisrtSlot.day) - 1));

        const times = selectedSlots.map(s => s.hour).sort();
        const startTime = times[0];
        const lastHour = times[times.length - 1];
        const endHour = parseInt(lastHour.split(':')[0]) + 1;
        const endTime = `${endHour.toString().padStart(2, '0')}:00`;

        const paymentExpiry = new Date();
        paymentExpiry.setMinutes(paymentExpiry.getMinutes() + 15);

        const { data, error } = await supabase
            .from('bookings')
            .insert([{
                room_type: selectedRoom,
                room_name: roomData[selectedRoom].name[currentLang],
                client_name: formData.name,
                client_phone: formData.phone,
                client_email: formData.email || null,
                gues_count: parseInt(formData.guestCount),
                booking_date: bookingDate.toISOString().split('T')[0],
                start_time: startTime,
                end_time: endTime,
                time_slots: selectedSlots,
                duration_hours: pricing.durationHours,
                room_cost: pricing.roomCost,
                menu_cost: pricing.menuCost,
                total_cost: pricing.totalCost,
                deposit_amount: pricing.depositAmount,
                remaining_amount: pricing.remainingAmount,
                menu_preorder: formData.menu.length > 0 ? formData.menu : null,
                additional_notes: formData.notes || null,
                payment_status: 'pending',
                booking_status: 'pending',
                payment_expires_at: paymentExpiry.toISOString()
            }])
            .select()
            .single();
        if (bookingError) {
            console.error('Database error: ', bookingError);
            throw new Error('Failed to create booking.');
        }

        console.log('Booking created: ', booking);
    
        const emailParams = {
            client_name: formData.name,
            client_phone: formData.phone,
            client_email: formData.email || "Не указано.",
            guest_count: formData.guestCount,
            room_name: formData.room,
            selected_time: formData.time,
            additional_notes: formData.notes || "Нет дополнительных пожеланий.",
            menu_preorder: formData.menu || "Нет предзаказа.",
            booking_date: new Date().toLocaleString('ru-RU')
        }

        console.log("Sending email parameters: ", emailParams);

        await emailjs.send(
            EMAILJS_CONFIG.serviceID,
            EMAILJS_CONFIG.templateID,
            emailParams
        );

        console.log('Email sent successfully.');

        document.getElementById('successMessage').innerHTML = `
            <strong> Забронировано!</strong><br>
            Номер: ${booking.booking_number}<br>
            К оплате у вас: ${pricing.depositAmount.toLocaleString()}₸<br>
            Перенаправление на оплату...`;
        document.getElementById('successMessage').classList.add('show');

        sessionStorage.setItem('pendingBooking', JSON.stringify({
            bookingNumber: booking.booking_number,
            bookingId: bookingId,
            depositAmount: pricing.depositAmount,
            totalCost: pricing.totalCost,
            remainingAmount: pricing.remainingAmount,
            roomName: formData.room,
            bookingDate: bookingDate.toLocaleDateString('ru-RU'),
            timeRange: `${startTime} - ${endTime}`,
            clientName: formData.name,
            expiresAt: paymentExpiry.toISOString()
        }));

        document.getElementById('bookingForm').reset();
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });
        selectedSlots = [];

        setTimeout(() => {
            window.location.href = 'payment.html';
        }, 2000);

    } catch (err) {
        console.error('Error:', err);
        alert(currentLang === 'ru' ? 'Произошла ошибка при обработке бронирования. Пожалуйста, попробуйте еще раз или позвоните нам.' :
              currentLang === 'kz' ? 'Брондау кезінде қате пайда болды. Қайтадан көріңіз немесе бізге хабарласыңыз.' :
              'An error occurred while processing your booking. Please try again or call us.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

document.addEventListener('DOMContentLoaded', function() {
    generateTimetable();
    generateMenuPreorder();
    document.getElementById('selectedRoom').value = roomData[selectedRoom].name[currentLang];
});

function switchLang(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('[data-ru]').forEach(el => {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            if (el.placeholder) el.placeholder = el.getAttribute(`data-${lang}`);
        } else {
            el.textContent = el.getAttribute(`data-${lang}`);
        }
    });
    
    document.getElementById('selectedRoom').value = roomData[selectedRoom].name[lang];
    generateTimetable();
    generateMenuPreorder();
    updateSelectedSlots();
}