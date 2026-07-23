/**
 * Quick Backend Endpoint Test Script
 * Run with: node test-endpoints.js
 * 
 * This script tests the cart and order endpoints
 */

const BASE_URL = 'http://localhost:5112/api';

// Test user credentials
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'Test@123',
  name: 'Test User'
};

let authToken = '';
let productId = '';
let orderId = '';

// Helper function to make requests
async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// Test functions
async function testRegister() {
  console.log('\n🔐 Testing User Registration...');
  const result = await makeRequest('/auth/register', 'POST', TEST_USER);
  
  if (result.status === 201 || result.status === 400) {
    console.log('✅ Register endpoint working');
    return true;
  } else {
    console.log('❌ Register failed:', result);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Testing User Login...');
  const result = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (result.status === 200 && result.data.token) {
    authToken = result.data.token;
    console.log('✅ Login successful, token received');
    return true;
  } else {
    console.log('❌ Login failed:', result);
    return false;
  }
}

async function testGetProducts() {
  console.log('\n📦 Testing Get Products...');
  const result = await makeRequest('/product');
  
  if (result.status === 200 && result.data.products) {
    productId = result.data.products[0]?._id;
    console.log(`✅ Products fetched, using product ID: ${productId}`);
    return true;
  } else {
    console.log('❌ Get products failed:', result);
    return false;
  }
}

async function testAddToCart() {
  console.log('\n🛒 Testing Add to Cart...');
  const result = await makeRequest('/cart/add', 'POST', {
    productId: productId,
    quantity: 2
  }, authToken);
  
  if (result.status === 200 || result.status === 201) {
    console.log('✅ Product added to cart');
    return true;
  } else {
    console.log('❌ Add to cart failed:', result);
    return false;
  }
}

async function testGetCart() {
  console.log('\n🛒 Testing Get Cart...');
  const result = await makeRequest('/cart', 'GET', null, authToken);
  
  if (result.status === 200 && result.data.cart) {
    console.log(`✅ Cart fetched, items: ${result.data.cart.items.length}`);
    return true;
  } else {
    console.log('❌ Get cart failed:', result);
    return false;
  }
}

async function testUpdateCartQuantity() {
  console.log('\n🛒 Testing Update Cart Quantity...');
  const result = await makeRequest('/cart/update', 'PUT', {
    productId: productId,
    quantity: 3
  }, authToken);
  
  if (result.status === 200) {
    console.log('✅ Cart quantity updated');
    return true;
  } else {
    console.log('❌ Update cart failed:', result);
    return false;
  }
}

async function testCreateOrder() {
  console.log('\n📦 Testing Create Order...');
  const result = await makeRequest('/orders/create', 'POST', {
    items: [
      {
        product: productId,
        quantity: 2
      }
    ],
    shippingInfo: {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      country: 'Test Country',
      zipCode: '12345'
    },
    paymentMethod: 'COD',
    subtotal: 100,
    shippingCost: 10,
    tax: 10,
    total: 120
  }, authToken);
  
  if (result.status === 201 && result.data.order) {
    orderId = result.data.order._id;
    console.log(`✅ Order created, ID: ${orderId}`);
    return true;
  } else {
    console.log('❌ Create order failed:', result);
    return false;
  }
}

async function testGetOrders() {
  console.log('\n📋 Testing Get User Orders...');
  const result = await makeRequest('/orders/my-orders', 'GET', null, authToken);
  
  if (result.status === 200 && result.data.orders) {
    console.log(`✅ Orders fetched, count: ${result.data.orders.length}`);
    return true;
  } else {
    console.log('❌ Get orders failed:', result);
    return false;
  }
}

async function testGetOrderById() {
  console.log('\n📋 Testing Get Order by ID...');
  const result = await makeRequest(`/orders/${orderId}`, 'GET', null, authToken);
  
  if (result.status === 200 && result.data.order) {
    console.log('✅ Order details fetched');
    return true;
  } else {
    console.log('❌ Get order by ID failed:', result);
    return false;
  }
}

async function testCancelOrder() {
  console.log('\n❌ Testing Cancel Order...');
  const result = await makeRequest(`/orders/${orderId}/cancel`, 'PUT', null, authToken);
  
  if (result.status === 200) {
    console.log('✅ Order cancelled successfully');
    return true;
  } else {
    console.log('❌ Cancel order failed:', result);
    return false;
  }
}

async function testAddToWishlist() {
  console.log('\n❤️ Testing Add to Wishlist...');
  const result = await makeRequest('/wishlist/add', 'POST', {
    productId: productId
  }, authToken);
  
  if (result.status === 200 || result.status === 201) {
    console.log('✅ Product added to wishlist');
    return true;
  } else {
    console.log('❌ Add to wishlist failed:', result);
    return false;
  }
}

async function testGetWishlist() {
  console.log('\n❤️ Testing Get Wishlist...');
  const result = await makeRequest('/wishlist', 'GET', null, authToken);
  
  if (result.status === 200) {
    console.log('✅ Wishlist fetched');
    return true;
  } else {
    console.log('❌ Get wishlist failed:', result);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Backend Endpoint Tests...');
  console.log('📍 Base URL:', BASE_URL);
  console.log('⚠️  Make sure the backend server is running on port 5112');
  
  const tests = [
    testRegister,
    testLogin,
    testGetProducts,
    testAddToCart,
    testGetCart,
    testUpdateCartQuantity,
    testAddToWishlist,
    testGetWishlist,
    testCreateOrder,
    testGetOrders,
    testGetOrderById,
    testCancelOrder,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log('❌ Test error:', error.message);
      failed++;
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Backend is ready for use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);
