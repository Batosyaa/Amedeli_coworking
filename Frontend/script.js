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

function generateTimetable() {
    const days = {
        ru: ['Время', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        kz: ['Уақыт', 'Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'],
        en: ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    };
    
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    
    const grid = document.getElementById('timetableGrid');
    grid.innerHTML = '';
    days[currentLang].forEach((day, index) => {
        const cell = document.createElement('div');
        cell.className = index === 0 ? 'time-header' : 'day-header';
        cell.textContent = day;
        grid.appendChild(cell);
    });
    hours.forEach(hour => {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-header';
        timeLabel.textContent = hour;
        grid.appendChild(timeLabel);
        for (let day = 1; day <= 7; day++) {
            const slot = document.createElement('div');
            slot.className = 'time-slot available';
            slot.dataset.day = day;
            slot.dataset.hour = hour;
            slot.dataset.room = selectedRoom;
            
            slot.addEventListener('click', function() {
                if (!this.classList.contains('booked')) {
                    this.classList.toggle('selected');
                    updateSelectedSlots();
                }
            });
            
            grid.appendChild(slot);
        }
    });
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

document.getElementById('bookingForm').addEventListener('submit', function(e) {
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

    emailjs.send(
        EMAILJS_CONFIG.serviceID,
        EMAILJS_CONFIG.templateID,
        emailParams
    )
    .then(function(response) {
        console.log("Success.. ", response.status, response.text);

        document.getElementById('successMessage').classList.add('show');

        document.getElementById('bookingForm').reset();
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });
        selectedSlots = [];

        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        setTimeout(() => {
            document.getElementById('successMessage').classList.remove('show');
        }, 5000);

        const whatsappMessage = encodeURIComponent(
            `Здравствуйте! Я отправил заявку на бронирование ${formData.room} через сайт на имя: ${formData.name}`
        );
        setTimeout(() => {
            window.open(`https://wa.me/77076133843?text=${whatsappMessage}`, '_blank');
        }, 1000);
    
    }, function(error) {
        console.error('Failed... ', error);
        alert(currentLang === 'ru' ? 'Ошибка отправки. Попробуйте позже.' : 
                currentLang === 'kz' ? 'Жіберу қатесі. Кейінірек көріңіз.' : 
                    'Sending error. Please try again later.');
        
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
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