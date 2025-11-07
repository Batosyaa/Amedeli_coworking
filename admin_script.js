        const ADMIN_PASSWORD = 'AmideliHub2025!';
        const SUPABASE_URL = 'https://ppjbczfdcrsmikpbxfcm.supabase.co';
        const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwamJjemZkY3JzbWlrcGJ4ZmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTU5MTEsImV4cCI6MjA3ODAzMTkxMX0.0Rl6Nu2Ha9Ht1qdn38FTolB9SyhBwMpMuelVupHM2Zg';

        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

        let allBookings = [];
        let refreshInterval;

        document.getElementById('loginForm').addEventListener('submit', function(e) {
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
            switch(status) {
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

                switch(dateFilter) {
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