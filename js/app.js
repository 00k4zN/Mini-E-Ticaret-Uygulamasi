// Burda değişkenleri global olarak tanımladım çünkü her yerden erişmem gerekiyor
let products = [];
let cart = [];
let favorites = [];

// Sayfalama için gereken değişkenler - bunlar ürünleri sayfalara bölmek için lazım
let currentPage = 1;
const productsPerPage = 12; // Her sayfada 12 ürün gösteriyorum
let filteredProducts = [];

// Sayfa yüklendiğinde çalışacak ana fonksiyon - jQuery ile yazdım
$(document).ready(function() {
    // Önce localStorage'dan sepet ve favorileri alıyorum - boşsa boş array oluyor
    if (localStorage.getItem('cart')) {
        cart = JSON.parse(localStorage.getItem('cart'));
        updateCartCount(); // Sepetteki ürün sayısını güncelle
    }

    if (localStorage.getItem('favorites')) {
        favorites = JSON.parse(localStorage.getItem('favorites'));
        updateFavoritesCount(); // Favorilerdeki ürün sayısını güncelle
    }

    // API'den ürünleri çekiyorum
    fetchProducts().then(() => {
        resetFavorites();
    });
    
    // Butonlar için click eventlerini ayarlıyorum
    setupEventListeners();
    
    // Mobil menü için hamburger butonu ekliyorum - responsive tasarım için
    $('.header-right').append('<button class="mobile-menu-toggle"><i class="fa fa-bars"></i></button>');
    
    // Hamburger menüye tıklanınca menüyü açıp kapatıyorum
    $(document).on('click', '.mobile-menu-toggle', function() {
        $('.main-nav').toggleClass('active');
    });
    
    // Menü dışına tıklanınca menüyü kapatıyorum - UX için önemli
    $(document).on('click', function(event) {
        if (!$(event.target).closest('.header-right, .mobile-menu-toggle').length) {
            $('.main-nav').removeClass('active');
        }
    });

    // Hangi sayfadaysak o linki active yapıyorum
    setActiveNavLink();
});

// Sayfa ilk açıldığında yapılacak işlemler
function initializePage() {
    const currentPath = window.location.pathname;
    
    // Hangi sayfadaysak ona göre içerik yüklüyorum
    if (currentPath.includes('cart.html')) {
        renderCart();
    } else if (currentPath.includes('favorites.html')) {
        renderFavorites();
    } else if (products.length > 0) {
        initializeCarousel();
    }
}

// Bütün click eventlerini burda topluyorum - kod düzeni için
function setupEventListeners() {
    // Arama formunu submit edince sayfayı yenilemesini engelliyorum
    $('#searchForm').on('submit', function(e) {
        e.preventDefault();
        searchProducts();
    });

    // Ürün detay butonuna tıklanınca modalı açıyorum
    $(document).on('click', '.detail-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Detay butonuna tıklandı');
        
        // Ürün ID'sini iki farklı yerden almayı deniyorum
        let productId = $(this).data('id');
        if (!productId) {
            productId = parseInt($(this).closest('.product-card').attr('data-id'));
        }
        
        console.log('Ürün ID:', productId);
        
        if (productId) {
            showProductDetail(productId);
        }
    });

    // Sepete ekle butonuna tıklanınca
    $(document).on('click', '.add-to-cart-btn', function(e) {
        e.preventDefault();
        const productId = parseInt($(this).data('id') || $(this).closest('.product-card').data('id'));
        addToCart(productId);
        // Animasyon ekliyorum - kullanıcı geri bildirimi için
        $(this).addClass('shake');
        setTimeout(() => {
            $(this).removeClass('shake');
        }, 500);
    });

    // Favorilere ekle/çıkar butonu
    $(document).on('click', '.add-to-favorites-btn', function(e) {
        e.preventDefault();
        const productId = parseInt($(this).data('id') || $(this).closest('.product-card').data('id'));
        toggleFavorite(productId);
        // Burda da aynı animasyonu kullanıyorum
        $(this).addClass('shake');
        setTimeout(() => {
            $(this).removeClass('shake');
        }, 500);
    });

    // Sepeti temizle butonu
    $('#clearCart').on('click', function(e) {
        e.preventDefault();
        clearCart();
    });

    // Sepetten tek ürün silme butonu
    $(document).on('click', '.cart-item-remove', function(e) {
        e.preventDefault();
        const productId = parseInt($(this).data('id'));
        removeFromCart(productId);
    });

    // Favorilerden kaldır butonu
    $(document).on('click', '.remove-favorite-btn', function(e) {
        e.preventDefault();
        const productId = parseInt($(this).data('id'));
        toggleFavorite(productId);
    });

    // Modal kapatma butonu - çarpı işareti
    $(document).on('click', '.close-modal', function() {
        $('#productDetailModal').css('display', 'none');
    });

    // Kategori filtreleme butonları
    $('.filter-btn').on('click', function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        
        const category = $(this).data('filter');
        filterProducts(category);
    });
}

// API'den ürünleri çeken fonksiyon
function fetchProducts() {
    // Yükleniyor mesajı gösteriyorum
    $('#productList').html('<div class="loading">Ürünler yükleniyor</div>');
    
    // Promise döndürerek asenkron işlemin tamamlandığını bildirebiliriz
    return new Promise((resolve, reject) => {
        // AJAX ile fake API'den ürünleri çekiyorum
        $.ajax({
            url: 'https://fakestoreapi.com/products',
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                products = data;
                renderProducts(products);
                initializePage();
                resolve(data); // Başarılı olduğunda promise'i çözümlüyoruz
            },
            error: function(err) {
                // Hata olursa kullanıcıya gösteriyorum
                $('#productList').html('<div class="error">Ürünler yüklenemedi.</div>');
                reject(err); // Hata durumunda promise'i reddediyoruz
            }
        });
    });
}

// Öne çıkan ürünler için carousel - slick slider kullanıyorum
function initializeCarousel() {
    const $featuredProducts = $('#featuredProducts');
    if (!$featuredProducts.length) return;
    
    // Rastgele 5 ürün seçiyorum carousel için
    const featuredProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    $featuredProducts.empty();
    
    // Slick için container oluşturuyorum
    const $slickContainer = $('<div class="slick-carousel"></div>');
    $featuredProducts.append($slickContainer);
    
    // Ürün kartlarını ekliyorum
    featuredProducts.forEach(product => {
        const $productCard = createProductCard(product);
        $slickContainer.append($productCard);
    });
    
    // Slick'i başlatıyorum - biraz timeout koydum çünkü bazen sorun çıkarıyordu
    setTimeout(() => {
        try {
            $slickContainer.slick({
                dots: true,
                infinite: true,
                speed: 500,
                slidesToShow: 3,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                responsive: [
                    {
                        breakpoint: 992,
                        settings: {
                            slidesToShow: 2
                        }
                    },
                    {
                        breakpoint: 576,
                        settings: {
                            slidesToShow: 1
                        }
                    }
                ]
            });
        } catch (error) {
            // Hata olursa sessizce devam et
        }
    }, 100);
}


// Ürün sayısını güncelleyen fonksiyon - Bu fonksiyonu kaldırın
function updateProductCount() {
    const productCount = filteredProducts.length;
    $('#productCount').text(productCount);
}

// Ürünleri sayfaya yerleştiren fonksiyon - sayfalama da burda
function renderProducts(productsToRender) {
    const $productList = $('#productList');
    if ($productList.length === 0) return;
    filteredProducts = productsToRender;
    $productList.empty();
    // Ürün sayısını güncelliyorum
    updateProductCount();
    
    // Hiç ürün yoksa mesaj gösteriyorum
    if (productsToRender.length === 0) {
        $productList.html('<div class="no-products-message">Ürün bulunamadı.</div>');
        return;
    }
    
    // Sayfalama hesaplamaları
    const totalPages = Math.ceil(productsToRender.length / productsPerPage);
    
    // Eğer sayfa sayısı değiştiyse en başa dönüyorum
    if (currentPage > totalPages) currentPage = 1;
    
    // Bu sayfada gösterilecek ürünlerin aralığını hesaplıyorum
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = Math.min(startIndex + productsPerPage, productsToRender.length);
    
    // Sadece bu sayfadaki ürünleri alıyorum
    const currentPageProducts = productsToRender.slice(startIndex, endIndex);
    
    // Ürünleri sayfaya ekliyorum
    currentPageProducts.forEach(product => {
        const $productCard = createProductCard(product);
        $productList.append($productCard);
    });
    
    // Sayfalama butonlarını oluşturuyorum
    renderPagination(totalPages);
}

// Ürün kartını oluşturan fonksiyon - her ürün için bunu kullanıyorum
function createProductCard(product) {
    // Ürün kartı için HTML şablonunu oluşturuyorum - bootstrap card yapısına benzer
    const card = $('<div>').addClass('product-card').attr('data-id', product.id);
    
    // Ürün resmini koyuyorum - resim yoksa placeholder kullanıyorum
    const imageContainer = $('<div>').addClass('product-image');
    const image = $('<img>').attr('src', product.image).attr('alt', product.title);
    imageContainer.append(image);
    
    // Favori butonu - sağ üste yerleştiriyorum
    const favBtn = $('<button>')
        .addClass('add-to-favorites-btn corner-btn')
        .attr('data-id', product.id)
        .html('<i class="' + (favorites.includes(product.id) ? 'fas' : 'far') + ' fa-heart"></i>');
    
    imageContainer.append(favBtn);
    
    // Ürün bilgilerini içeren kısmı oluşturuyorum
    const info = $('<div>').addClass('product-info');
    
    // Başlığı kısaltıyorum çünkü çok uzun olabiliyor
    const title = $('<h3>').addClass('product-title').text(truncateText(product.title, 50));
    
    // Fiyatı TL olarak gösteriyorum
    const price = $('<div>').addClass('product-price').text(product.price + ' TL');
    
    // Puanlama yıldızlarını oluşturuyorum
    const rating = $('<div>').addClass('product-rating');
    const stars = Math.round(product.rating.rate);
    for (let i = 0; i < 5; i++) {
        const star = $('<i>').addClass(i < stars ? 'fas fa-star' : 'far fa-star');
        rating.append(star);
    }
    rating.append($('<span>').text(`(${product.rating.count})`));
    
    // Butonları oluşturuyorum - artık sadece detay ve sepete ekle
    const buttons = $('<div>').addClass('product-buttons');
    
    const detailBtn = $('<button>')
        .addClass('detail-btn')
        .attr('data-id', product.id)
        .html('<i class="fas fa-eye"></i> Detay');
    
    const cartBtn = $('<button>')
        .addClass('add-to-cart-btn')
        .attr('data-id', product.id)
        .html('<i class="fas fa-shopping-cart"></i> Sepete Ekle');
    
    buttons.append(detailBtn, cartBtn);
    
    // Hepsini bir araya getiriyorum
    info.append(title, price, rating, buttons);
    card.append(imageContainer, info);
    
    return card;
}

// Sayfalama butonlarını oluşturan fonksiyon
function renderPagination(totalPages) {
    const $pagination = $('.pagination');
    if (!$pagination.length) return;
    
    $pagination.empty();
    
    // Önceki sayfa butonu
    const prevBtn = $('<button>')
        .addClass('page-nav')
        .html('<i class="fas fa-chevron-left"></i>')
        .prop('disabled', currentPage === 1)
        .on('click', () => navigateToPage(currentPage - 1));
    
    // Sonraki sayfa butonu
    const nextBtn = $('<button>')
        .addClass('page-nav')
        .html('<i class="fas fa-chevron-right"></i>')
        .prop('disabled', currentPage === totalPages)
        .on('click', () => navigateToPage(currentPage + 1));
    
    // Sayfa numaralarını oluşturuyorum
    const numbers = $('<div>').addClass('page-numbers');
    
    // İlk sayfayı her zaman gösteriyorum
    numbers.append(createPageNumber(1));
    
    // Ortadaki sayfaları gösteriyorum
    if (totalPages > 1) {
        if (currentPage > 3) {
            numbers.append($('<span>').addClass('ellipsis').text('...'));
        }
        
        // Aktif sayfanın etrafındaki 2 sayfayı gösteriyorum
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            numbers.append(createPageNumber(i));
        }
        
        if (currentPage < totalPages - 2) {
            numbers.append($('<span>').addClass('ellipsis').text('...'));
        }
        
        // Son sayfayı her zaman gösteriyorum
        numbers.append(createPageNumber(totalPages));
    }
    
    $pagination.append(prevBtn, numbers, nextBtn);
}

// Sayfa numarası butonunu oluşturan yardımcı fonksiyon
function createPageNumber(pageNum) {
    return $('<a>')
        .addClass(pageNum === currentPage ? 'active' : '')
        .text(pageNum)
        .on('click', () => navigateToPage(pageNum));
}

// Sayfalar arası geçiş yapan fonksiyon
function navigateToPage(page) {
    if (page < 1 || page > Math.ceil(filteredProducts.length / productsPerPage)) return;
    
    currentPage = page;
    renderProducts(filteredProducts);
    
    // Sayfanın en üstüne scroll yapıyorum - UX için
    window.scrollTo({top: 0, behavior: 'smooth'});
}

// Ürün detay modalını açan fonksiyon
function showProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.log('Ürün bulunamadı:', productId);
        return;
    }
    
    console.log('Ürün bulundu:', product);
    
    // Modal içeriğini oluşturuyorum
    const modalContent = `
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <div class="product-modal-content">
                <div class="modal-left">
                    <img src="${product.image}" alt="${product.title}">
                </div>
                <div class="modal-right">
                    <h2>${product.title}</h2>
                    <div class="modal-price">${product.price} TL</div>
                    <div class="rating">
                        ${createRatingStars(product.rating.rate)}
                        <span>(${product.rating.count} değerlendirme)</span>
                    </div>
                    <div id="modalProductDescription">
                        ${product.description}
                    </div>
                    <div class="modal-buttons">
                        <button class="btn btn-primary add-to-cart-btn" data-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i> Sepete Ekle
                        </button>
                        <button class="btn btn-secondary add-to-favorites-btn" data-id="${product.id}">
                            <i class="${favorites.includes(product.id) ? 'fas' : 'far'} fa-heart"></i>
                            ${favorites.includes(product.id) ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Modalı gösteriyorum
    const $modal = $('#productDetailModal');
    $modal.html(modalContent);
    $modal.css('display', 'block'); // display: none yerine block yapıyorum
}

// Yıldızları oluşturan yardımcı fonksiyon
function createRatingStars(rating) {
    const stars = Math.round(rating);
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `<i class="${i < stars ? 'fas' : 'far'} fa-star"></i>`;
    }
    return html;
}

// Sepete ürün ekleyen fonksiyon
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Ürün zaten sepette var mı diye bakıyorum
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Varsa miktarını artır
        existingItem.quantity++;
    } else {
        // Yoksa yeni ekle
        cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    // LocalStorage'ı güncelliyorum
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Sepet sayısını güncelliyorum
    updateCartCount();
    
    // Eğer sepet sayfasındaysak sepeti yeniden çiziyorum
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
}

// Sepetteki ürün sayısını gösteren fonksiyon
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    $('.cart-count').text(count);
}

// Favorilerdeki ürün sayısını gösteren fonksiyon
function updateFavoritesCount() {
    $('.favorites-count').text(favorites.length);
}

// Sepeti gösteren fonksiyon
function renderCart() {
    const $cartItems = $('#cartItems');
    if (!$cartItems.length) return;
    
    if (cart.length === 0) {
        // Sepet boşsa mesaj gösteriyorum
        $cartItems.html('<div class="empty-cart-message">Sepetiniz boş.</div>');
        updateCartSummary(0, 0);
        return;
    }
    
    // Önce listeyi temizliyorum
    $cartItems.empty();
    
    let subtotal = 0;
    
    // Template eleman - sonradan klonlanacak
    const $template = $(`
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="" alt="">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-title"></div>
                <div class="cart-item-price"></div>
                <div class="cart-item-quantity">
                    <button class="decrease-quantity">-</button>
                    <input type="number" readonly>
                    <button class="increase-quantity">+</button>
                </div>
                <button class="cart-item-remove">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `).hide();
    
    // Her sepet öğesi için klon oluşturup listeye ekliyorum
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        // Template'in bir klonunu oluşturdum
        const $item = $template.clone();
        
        // Klonu görünür yaptım
        $item.show();
        
        // Data attribute'unu ekliyorum
        $item.attr('data-id', item.id);
        
        // Ürün bilgilerini klona yerleştiriyorum
        $item.find('img').attr('src', item.image).attr('alt', item.title);
        $item.find('.cart-item-title').text(item.title);
        $item.find('.cart-item-price').text(item.price + ' TL');
        $item.find('input').val(item.quantity);
        
        // Event handlers'ı ekliyorum (inline onclick yerine)
        $item.find('.decrease-quantity').on('click', () => updateCartItemQuantity(item.id, -1));
        $item.find('.increase-quantity').on('click', () => updateCartItemQuantity(item.id, 1));
        $item.find('.cart-item-remove').attr('data-id', item.id);
        
        // Klonu listeye ekliyorum
        $cartItems.append($item);
    });
    
    // Sepet özetini güncelliyorum
    const shipping = subtotal > 500 ? 0 : 29.90; // 500 TL üzeri kargo bedava
    updateCartSummary(subtotal, shipping);
}

// Sepet özetini güncelleyen fonksiyon - Eksik olan bu fonksiyonu ekliyoruz
function updateCartSummary(subtotal, shipping) {
    // Subtotal (ara toplam) güncelleniyor
    $('#subtotal').text(subtotal.toFixed(2));
    
    // Kargo ücreti güncelleniyor
    $('#shipping').text(shipping.toFixed(2));
    
    // Varsa indirim (şu an sabit 0)
    const discount = 0;
    $('#discount').text(discount.toFixed(2));
    
    // Genel toplam hesaplanıp güncelleniyor
    const total = subtotal + shipping - discount;
    $('#cartTotal').text(total.toFixed(2));
}

// Sepeti temizleyen fonksiyon
function clearCart() {
    const $cartItems = $('#cartItems .cart-item');
    
    // Önce tüm ürünlere removing class'ı ekliyorum
    $cartItems.addClass('removing');
    
    // Animasyon bittikten sonra sepeti temizliyorum
    setTimeout(() => {
        cart = [];
        
        // LocalStorage'ı güncelliyorum
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepeti yeniden çiziyorum
        renderCart();
        updateCartCount();
    }, 500); // 300ms animasyon süresi
}

// Sepetten tek ürün silme fonksiyonu
function removeFromCart(productId) {
    // Silinecek ürünün elementini buluyorum
    const $item = $(`.cart-item[data-id="${productId}"]`);
    
    // Animasyonu başlatıyorum
    $item.addClass('removing');
    
    // Animasyon bittikten sonra ürünü sepetten çıkarıyorum
    setTimeout(() => {
        // Ürünü sepetten çıkarıyorum
        cart = cart.filter(item => item.id !== productId);
        
        // LocalStorage'ı güncelliyorum
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Sepeti yeniden çiziyorum
        renderCart();
        updateCartCount();
    }, 300); // 300ms animasyon süresi
}

// Sepetteki ürün miktarını güncelleyen fonksiyon
function updateCartItemQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    item.quantity = Math.max(1, item.quantity + change); // En az 1 olabilir
    
    // LocalStorage'ı güncelliyorum
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Sepeti yeniden çiziyorum
    renderCart();
    updateCartCount();
}

// Favorilere ekleme/çıkarma fonksiyonu
function toggleFavorite(productId) {
    const index = favorites.indexOf(productId);
    
    if (index === -1) {
        // Favorilerde yoksa ekliyorum
        favorites.push(productId);
    } else {
        // Varsa çıkarıyorum
        favorites.splice(index, 1);
        
        // Favoriler sayfasındaysak, DOM'dan ilgili öğeyi kaldır
        if (window.location.pathname.includes('favorites.html')) {
            const $item = $(`.favorite-item`).filter(function() {
                return $(this).find('[data-id="' + productId + '"]').length > 0;
            });
            
            if ($item.length) {
                // Animasyon ile kaldır
                $item.fadeOut(300, function() {
                    $(this).remove();
                    
                    // Eğer son ürün de kaldırıldıysa boş mesajını göster
                    if (favorites.length === 0) {
                        $('#favoritesList').html('<div class="empty-favorites-message">Favorileriniz boş.</div>');
                    }
                });
            }
        }
    }
    
    // LocalStorage'ı güncelliyorum
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Favori sayısını güncelliyorum
    updateFavoritesCount();
    
    // Favori butonlarını güncelliyorum
    $(`.add-to-favorites-btn[data-id="${productId}"]`).each(function() {
        const $btn = $(this);
        const $icon = $btn.find('i');
        
        if (index === -1) {
            // Favorilere eklendi
            $icon.removeClass('far').addClass('fas');
            if ($btn.hasClass('btn')) {
                $btn.text(' Favorilerden Çıkar');
            }
        } else {
            // Favorilerden çıkarıldı
            $icon.removeClass('fas').addClass('far');
            if ($btn.hasClass('btn')) {
                $btn.text(' Favorilere Ekle');
            }
        }
    });
}

// Favoriler sayfasını gösteren fonksiyon
function renderFavorites() {
    const $favoritesList = $('#favoritesList');
    if (!$favoritesList.length) return;
    
    // Bu kısmı ekleyelim: Favorileri temizleme - geçersiz ürün ID'lerini kaldırma
    const validFavorites = favorites.filter(favId => 
        products.some(product => product.id === favId)
    );
    
    // Eğer geçersiz favoriler varsa, bunları temizle
    if (validFavorites.length !== favorites.length) {
        favorites = validFavorites;
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesCount();
    }
    
    if (favorites.length === 0) {
        // Favori yoksa mesaj gösteriyorum
        $favoritesList.html('<div class="empty-favorites-message">Favorileriniz boş.</div>');
        return;
    }
    
    // Önce listeyi temizliyorum>>>|||
    $favoritesList.empty();
    
    // Template eleman - sonradan klonlanacak
    const $template = $(`
        <div class="favorite-item">
            <div class="favorite-item-image">
                <img src="" alt="">
            </div>
            <div class="favorite-item-info">
                <div class="favorite-item-title"></div>
                <div class="favorite-item-price"></div>
                <div class="favorite-item-buttons">
                    <button class="add-to-cart-btn">
                        <i class="fas fa-shopping-cart"></i> Sepete Ekle
                    </button>
                    <button class="remove-favorite-btn">
                        <i class="fas fa-trash"></i> Favorilerden Çıkar
                    </button>
                </div>
            </div>
        </div>
    `).hide(); // Görünmez yaptım ki DOM'a eklediğimizde görünmesin
    
    // Her favori ürün için klon oluşturup listeye ekliyorum
    favorites.forEach(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        // Template'in bir klonunu oluşturdum
        const $item = $template.clone();
        
        // Klonu görünür yaptım.
        $item.show();
        
        // Ürün bilgilerini klona yerleştiriyorum
        $item.find('img').attr('src', product.image).attr('alt', product.title);
        $item.find('.favorite-item-title').text(product.title);
        $item.find('.favorite-item-price').text(product.price + ' TL');
        $item.find('.add-to-cart-btn').attr('data-id', product.id);
        $item.find('.remove-favorite-btn').attr('data-id', product.id);
        
        // Klonu listeye ekledim
        $favoritesList.append($item);
    });
}

// Ürün arama fonksiyonu
function searchProducts() {
    const searchTerm = $('#searchInput').val().toLowerCase().trim();
    
    if (!searchTerm) {
        // Arama terimi yoksa tüm ürünleri gösteriyorum
        renderProducts(products);
        return;
    }
    
    // Ürün adı ve açıklamasında arama yapıyorum
    const results = products.filter(product => 
        product.title.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    
    renderProducts(results);
}

// Kategori filtreleme fonksiyonu
function filterProducts(category) {
    if (category === 'all') {
        // Tüm ürünleri göster
        renderProducts(products);
    } else {
        // Seçilen kategorideki ürünleri filtrele
        const filtered = products.filter(product => product.category === category);
        renderProducts(filtered);
    }
}

// Aktif sayfayı belirleyen fonksiyon
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    
    // Bütün linklerin active classını kaldırıyorum
    $('.main-nav a').removeClass('active');
    
    // Hangi sayfadaysak o linke active class ekliyorum
    if (currentPath.includes('cart.html')) {
        $('.main-nav a[href="cart.html"]').addClass('active');
    } else if (currentPath.includes('favorites.html')) {
        $('.main-nav a[href="favorites.html"]').addClass('active');
    } else {
        $('.main-nav a[href="index.html"]').addClass('active');
    }
}

// Metni kısaltan yardımcı fonksiyon
function truncateText(text, maxLength) {
    // Metin çok uzunsa sonuna ... koyuyorum
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Bu fonksiyonu ekleyip DOM ve localStorage'ı senkronize etmeyi sağlıyoruz
function resetFavorites() {
    // Sadece mevcut products dizisinde olan favorileri tut
    favorites = favorites.filter(id => products.some(p => p.id === id));
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesCount();
}
