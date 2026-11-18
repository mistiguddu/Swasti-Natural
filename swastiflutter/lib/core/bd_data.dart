/// Bangladesh administrative divisions and their districts (8 divisions, 64 districts).
const Map<String, List<String>> kDivisions = {
  'Barishal': ['Barguna', 'Barishal', 'Bhola', 'Jhalokati', 'Patuakhali', 'Pirojpur'],
  'Chattogram': [
    'Bandarban',
    'Brahmanbaria',
    'Chandpur',
    'Chattogram',
    'Cox’s Bazar',
    'Cumilla',
    'Feni',
    'Khagrachhari',
    'Lakshmipur',
    'Noakhali',
    'Rangamati',
  ],
  'Dhaka': [
    'Dhaka',
    'Faridpur',
    'Gazipur',
    'Gopalganj',
    'Kishoreganj',
    'Madaripur',
    'Manikganj',
    'Munshiganj',
    'Narayanganj',
    'Narsingdi',
    'Rajbari',
    'Shariatpur',
    'Tangail',
  ],
  'Khulna': ['Bagerhat', 'Chuadanga', 'Jashore', 'Jhenaidah', 'Khulna', 'Kushtia', 'Magura', 'Meherpur', 'Narail', 'Satkhira'],
  'Mymensingh': ['Jamalpur', 'Mymensingh', 'Netrokona', 'Sherpur'],
  'Rajshahi': ['Bogura', 'Chapai Nawabganj', 'Joypurhat', 'Naogaon', 'Natore', 'Pabna', 'Rajshahi', 'Sirajganj'],
  'Rangpur': ['Dinajpur', 'Gaibandha', 'Kurigram', 'Lalmonirhat', 'Nilphamari', 'Panchagarh', 'Rangpur', 'Thakurgaon'],
  'Sylhet': ['Habiganj', 'Moulvibazar', 'Sunamganj', 'Sylhet'],
};

/// Order progress steps, in order.
const kOrderSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const kPaymentLabels = {
  'cash_on_delivery': 'Cash on delivery',
  'card': 'Card',
  'bkash': 'bKash',
  'nagad': 'Nagad',
  'rocket': 'Rocket',
  'bank_transfer': 'Bank transfer',
  'other': 'Other',
};

const kStatusLabels = {
  'pending': 'Pending',
  'confirmed': 'Confirmed',
  'processing': 'Processing',
  'shipped': 'Shipped',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled',
  'returned': 'Returned',
  'refunded': 'Refunded',
  'paid': 'Paid',
  'failed': 'Failed',
  'unpaid': 'Unpaid',
  'partially_refunded': 'Partially refunded',
};
