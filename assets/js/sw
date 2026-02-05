self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: 'assets/icons/favicon.png',
    badge: 'assets/icons/favicon.png',
    data: { taskId: data.taskId },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'عرض' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view' || event.action === '') {
    event.waitUntil(
      clients.openWindow('employee.html')
    );
  }
});
