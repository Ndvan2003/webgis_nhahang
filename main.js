import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM, TileWMS } from 'ol/source';
import { fromLonLat } from 'ol/proj';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Feature from 'ol/Feature';
import XYZ from 'ol/source/XYZ';
import Point from 'ol/geom/Point';
import Geolocation from 'ol/Geolocation';
import { Circle as CircleStyle, Fill, Stroke, Style, Icon, Text } from 'ol/style';
import { Circle as CircleGeom } from 'ol/geom';
import { defaults as defaultControls } from 'ol/control';
import { Overlay } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import LineString from 'ol/geom/LineString';
import { WFS, GML } from 'ol/format';


// khai báo biến 
let radiusLayer = null;
let routeLayer = null;
let userLocation = null;
let markerLayers = [];

const map = new Map({
  target: 'map',
  layers: [
    // Lớp bản đồ nền OpenStreetMap (OSM)
    new TileLayer({
      source: new OSM(),
    }),
    // Lớp bản đồ từ GeoServer qua WMS
    //new TileLayer({
      //source: new TileWMS({
        //url: 'http://localhost:8082/geoserver/QLNH/wms',  // Địa chỉ WMS GeoServer
        //params: {
          //'LAYERS': 'QLTNH:nhahang', // Tên lớp bạn muốn hiển thị
          //'TILED': true,
       // },
        //serverType: 'geoserver',
      //}),
    //}),
  ],
  //
  view: new View({
    center: fromLonLat([105.773841, 21.072439]), // Toạ độ trung tâm bản đồ
    zoom: 15,
  }),
  controls: defaultControls({ zoom: false }), // Thêm control Zoom
});

// vị trí người dung
document.getElementById('my-location-btn').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lon = position.coords.longitude;
        const lat = position.coords.latitude;
        userLocation = [lon, lat]; // Lưu lại vị trí

        const locationFeature = new Feature({
          geometry: new Point(fromLonLat([lon, lat])),
          name: 'Vị trí của tôi',
        });

        locationFeature.setStyle(
          new Style({
            image: new Icon({
              src: 'vitri.png',
              scale: 0.1,
            }),
            text: new Text({
              text: 'Vị trí của tôi',
              offsetY: -25,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          })
        );

        const locationSource = new VectorSource({
          features: [locationFeature],
        });

        const locationLayer = new VectorLayer({
          source: locationSource,
        });

        map.addLayer(locationLayer);
        markerLayers.push(locationLayer);

        // 👉 Hiển thị vòng tròn 1km
        if (radiusLayer) map.removeLayer(radiusLayer);
        const circle = new CircleGeom(fromLonLat([lon, lat]), 1000); // 1000m
        const circleFeature = new Feature(circle);

        radiusLayer = new VectorLayer({
          source: new VectorSource({ features: [circleFeature] }),
          style: new Style({
            stroke: new Stroke({ color: '#1d4ed8', width: 2 }),
            fill: new Fill({ color: 'rgba(30, 64, 175, 0.1)' }),
          }),
        });

        map.addLayer(radiusLayer);

        map.getView().animate({
          center: fromLonLat([lon, lat]),
          zoom: 16,
          duration: 1000,
        });
      },
      (error) => {
        console.error('Error getting location: ', error);
        alert('Không thể lấy vị trí hiện tại!');
      }
    );
  } else {
    alert('Trình duyệt không hỗ trợ định vị!');
  }
});

// Thêm lớp vector từ WFS (GeoServer)
const vectorSource = new VectorSource({
  format: new GeoJSON(),
  url: '/geoserver/QLNH/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=QLNH%3Anhahang&outputFormat=application%2Fjson&maxFeatures=50'
});

const iconWithLabelStyle = function (feature) {
  return new Style({
    image: new Icon({
      src: 'anh.png',
      crossOrigin: 'anonymous',
      scale: 0.1,
      anchor: [0.5, 1]
    }),
    text: new Text({
      text: feature.get('ten') || '',
      offsetY: -35,
      font: 'bold 13px Arial',
      fill: new Fill({ color: '#000' }),
      stroke: new Stroke({ color: '#fff', width: 3 }),
    })
  });
};

const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: iconWithLabelStyle
});

map.addLayer(vectorLayer);
// popup
const popupContainer = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupCloser = document.getElementById('popup-closer');
const popupOverlay = new Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});
map.addOverlay(popupOverlay);
// gán label
const labels = {
  ten: 'Tên nhà hàng',
  dia_chi: 'Địa chỉ',
  mo_ta: 'Mô tả',
  khu_vuc: 'Khu vực',
  so_dien_th: 'Số điện thoại',
  mo_hinh: 'Mô hình',
  suc_chua_min: 'Sức chứa min',
  suc_chua_max: 'Sức chứa max',
  dien_tich_min: 'Diện tích min (m²)',
  dien_tich_max: 'Diện tích max (m²)',
  gia_min: 'Giá tối thiểu (nghìn)',
  gia_max: 'Giá tối đa (nghìn)',
  kinh_do: 'Kinh độ',
  vi_do: 'Vĩ độ',
  thoi_gian: 'Giờ hoạt động',
  danh_gia: 'Đánh giá',
  gui_xe: 'Gửi xe'
};
// sự kiện click vào maker
map.on('singleclick', function (evt) {
  // Nếu popup đang mở không được mở mới
  //if (popupOverlay.getPosition()) {
    //return;
  //}
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feat) {
    return feat;
  });

  if (feature) {
    const coordinates = feature.getGeometry().getCoordinates(); 
    const properties = feature.getProperties();
    delete properties.geometry; // Bỏ geometry để không hiển thị
  
    let html = '<table style="width:100%; border-collapse: collapse;">';
    for (let key in properties) {
        const label = labels[key]
        let value = properties[key];
        if (key === 'danh_gia') value = parseFloat(value).toFixed(1);
        html += `<tr>
          <td style="font-weight: bold; padding: 4px; border-bottom: 1px solid #ccc;">${label}</td>
          <td style="padding: 4px; border-bottom: 1px solid #ccc;">${properties[key]}</td>
        </tr>`;
    }
    html += '</table>';

    popupContent.innerHTML = html;
    popupOverlay.setPosition(coordinates);
  } else {
    popupOverlay.setPosition(undefined); // Ẩn popup nếu click ra ngoài
  }
});
// Khi người dùng đóng popup bằng nút
popupCloser.onclick = function () {
  popupOverlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};

//tìm kiếm 
let allFeatures = [];

vectorSource.on('featuresloadend', function () {
  allFeatures = vectorSource.getFeatures();
});

// Lắng nghe sự kiện khi nhấn nút tìm

document.querySelector('.fa-search').addEventListener('click', () => {
  clearAllMapState();
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();

  if (!keyword) {
    alert('Vui lòng nhập từ khóa để tìm kiếm!');
    return;
  }

  if (keyword.length === 1) {
    alert('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm!');
    return;
  }

  const matched = allFeatures.filter(feature =>
    (feature.get('ten') || '').toLowerCase().startsWith(keyword)
  );

  vectorSource.clear();
  vectorSource.addFeatures(matched);

  if (matched.length > 0) {
    const feature = matched[0];
    const geometry = feature.getGeometry();
    const coordinates = geometry.getCoordinates();
    map.getView().animate({ center: coordinates, zoom: 17, duration: 1000 });

    // Vẽ đường đi nếu đã bật "vị trí của tôi"
    if (userLocation) {
      const [lon1, lat1] = userLocation;
      const lon2 = feature.get('kinh_do');
      const lat2 = feature.get('vi_do');

      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }

      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

      fetch(url)
        .then(response => response.json())
        .then(data => {
          if (!data.routes || data.routes.length === 0) return alert('Không thể vẽ đường đi!');
          const route = data.routes[0].geometry.coordinates;
          const dist = data.routes[0].distance;
          const distanceText = (dist / 1000).toFixed(2) + ' km';

          const routeFeature = new Feature({
            geometry: new LineString(route).transform('EPSG:4326', 'EPSG:3857')
          });

          routeFeature.setStyle(new Style({
            stroke: new Stroke({
              color: '#e11d48',
              width: 4,
            }),
            text: new Text({
              text: distanceText,
              font: 'bold 14px sans-serif',
              fill: new Fill({ color: '#111' }),
              stroke: new Stroke({ color: '#fff', width: 3 }),
              placement: 'line',
            }),
          }));

          routeLayer = new VectorLayer({
            source: new VectorSource({ features: [routeFeature] })
          });

          map.addLayer(routeLayer);
          map.getView().fit(routeFeature.getGeometry(), { padding: [60, 60, 60, 60], duration: 1000 });
        })
        .catch(() => alert('Không thể lấy dữ liệu đường đi!'));
    }
  } else {
    alert('Không tìm thấy nhà hàng!');
  }
});

// Khi  xoá hết inpt → khôi phục lại toàn bộ
document.getElementById('searchInput').addEventListener('input', (e) => {
  if (e.target.value.trim() === '') {
    vectorSource.clear();
    vectorSource.addFeatures(allFeatures);
  }
});
// nút lọc 
document.getElementById('apply-filter').addEventListener('click', () => {
  clearAllMapState();
  const timeRange = document.getElementById('filter-time').value;
  const area = document.getElementById('filter-area').value;
  const price = document.getElementById('filter-price').value;
  const rating = document.getElementById('filter-rating').value;
  const radius = parseFloat(document.getElementById('filter-radius').value);

  let filtered = allFeatures;

  // Lọc giờ mở cửa
  if (timeRange !== '') {
    const timeMap = {
      morning: [6, 11],
      afternoon: [11, 17],
      evening: [17, 23],
      late: [23, 30] // hỗ trợ tới 04:00 hôm sau
    };

    const [rangeStart, rangeEnd] = timeMap[timeRange];

    filtered = filtered.filter(f => {
      const raw = f.get('thoi_gian');
      if (!raw) return false;

      const timeRanges = raw.split('&').map(part => part.trim());

      return timeRanges.some(part => {
        const match = part.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
        if (!match) return false;

        let openH = parseInt(match[1], 10);
        let closeH = parseInt(match[3], 10);

        if (closeH < openH) closeH += 24;

        return (
          rangeStart >= openH && rangeStart < closeH ||
          openH >= rangeStart && openH < rangeEnd
        );
      });
    });
  }
  // Lọc diện tích
  if (area !== '') {
    const ranges = {
      '1': [50, 200],
      '2': [201, 400],
      '3': [401, 600],
      '4': [601, 800],
      '5': [801, Infinity],
    };
    const [min, max] = ranges[area];
    filtered = filtered.filter(f => {
      const minA = f.get('dien_tich_min') || 0;
      const maxA = f.get('dien_tich_max') || 0;
      return maxA >= min && minA <= max;
    });
  }

  // Lọc giá
  if (price !== '') {
    const ranges = {
      '1': [50, 200],
      '2': [201, 400],
      '3': [401, 600],
      '4': [601, Infinity],
    };
    const [min, max] = ranges[price];
    filtered = filtered.filter(f => {
      const minG = f.get('gia_min') || 0;
      const maxG = f.get('gia_max') || 0;
      return maxG >= min && minG <= max;
    });
  }

  // Lọc đánh giá
if (rating !== '') {
  const ranges = {
    '1': [1.0, 1.9],
    '2': [2.0, 2.9],
    '3': [3.0, 3.9],
    '4': [4.0, 4.9],
    '5': [5.0, 5.0]  
  };
  const [minR, maxR] = ranges[rating];
  filtered = filtered.filter(f => {
    const r = parseFloat(f.get('danh_gia') || 0);
    return r >= minR && r <= maxR;
  });
}

//Lọc theo bán kính 
if (!isNaN(radius)) {
  if (!userLocation) {
    alert('Vui lòng bật "Vị trí của tôi" trước khi lọc theo bán kính!');
    return;
  }
  
  const [lon1, lat1] = userLocation;
  filtered = filtered.filter(f => {
    const lon2 = f.get('kinh_do'); 
    const lat2 = f.get('vi_do');
    if (!lon2 || !lat2) return false;

    // Tính khoảng cách giữa vị trí người dùng và nhà hàng
    const d = calculateDistance(lat1, lon1, lat2, lon2);
    
    // Chỉ giữ lại nhà hàng trong phạm vi bán kính
    return d <= radius;
  });

  // Vẽ lại vòng tròn bán kính
  if (radiusLayer) map.removeLayer(radiusLayer);
  const circle = new CircleGeom(fromLonLat([lon1, lat1]), radius * 1000); // Vẽ vòng tròn bán kính
  const circleFeature = new Feature(circle);

  radiusLayer = new VectorLayer({
    source: new VectorSource({ features: [circleFeature] }),
    style: new Style({
      stroke: new Stroke({ color: '#1d4ed8', width: 2 }),
      fill: new Fill({ color: 'rgba(30, 64, 175, 0.1)' }),
    }),
  });

  map.addLayer(radiusLayer);

// Cập nhật lại bản đồ để chỉ hiển thị những nhà hàng lọc được
vectorSource.clear();
vectorSource.addFeatures(filtered);

// Nếu có kết quả, zoom vào vị trí đầu tiên trong danh sách đã lọc
if (filtered.length > 0) {
    const coord = filtered[0].getGeometry().getCoordinates();
    map.getView().animate({ center: coord, zoom: 16, duration: 1000 });
 } 
}
// 👉 Reset tất cả select lọc sau khi tìm kiếm
document.getElementById('filter-time').value = '';
document.getElementById('filter-area').value = '';
document.getElementById('filter-price').value = '';
document.getElementById('filter-rating').value = '';
document.getElementById('filter-radius').value = '';

});
// nút nhà hàng gần nhất 
function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Bán kính trái đất (đơn vị km)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Khoảng cách tính bằng km
}


function clearAllMapState() {
  if (radiusLayer) {
  map.removeLayer(radiusLayer);
  radiusLayer = null;
}
  // Xóa đường đi nếu có
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // Xoá tất cả marker tạm (vị trí của tôi, gợi ý...)
  markerLayers.forEach(layer => map.removeLayer(layer));
  markerLayers = [];

  // Ẩn popup nếu có
  popupOverlay.setPosition(undefined);

  // Hiển thị lại tất cả nhà hàng
  vectorSource.clear();
  vectorSource.addFeatures(allFeatures);

  // Zoom về vị trí đầu tiên nếu có
  if (allFeatures.length > 0) {
    const center = allFeatures[0].getGeometry().getCoordinates();
    map.getView().animate({ center: center, zoom: 14, duration: 800 });
  }
}

// tìm nút nhà hàng gần nhất
document.getElementById('nearest-btn').addEventListener('click', () => {
  clearAllMapState();
  if (!userLocation) return alert('Hãy bấm "Vị trí của tôi" trước!');
  if (!allFeatures.length) return alert('Dữ liệu nhà hàng chưa sẵn sàng!');

  let nearest = null, minDist = Infinity;
  const [lon1, lat1] = userLocation;

  allFeatures.forEach(f => {
    const lon2 = f.get('kinh_do'), lat2 = f.get('vi_do');
    if (lon2 && lat2) {
      const d = calculateDistance(lat1, lon1, lat2, lon2);
      if (d < minDist) {
        minDist = d;
        nearest = f;
      }
    }
  });

  if (!nearest) return alert('Không tìm thấy nhà hàng!');

  const dest = [nearest.get('kinh_do'), nearest.get('vi_do')];

  // Xoá nhà hàng cũ và chỉ hiển thị nhà hàng gần nhất
  vectorSource.clear();
  vectorSource.addFeature(nearest);

  // Vẽ đường đi thật từ OSRM
  
  if (routeLayer){
  map.removeLayer(routeLayer);
  routeLayer = null;
}
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${dest[0]},${dest[1]}?overview=full&geometries=geojson`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (!data.routes || data.routes.length === 0) return alert('Không thể vẽ đường đi!');
      const route = data.routes[0].geometry.coordinates;
      const dist = data.routes[0].distance;
      const distanceText = (dist / 1000).toFixed(2) + ' km';

      const routeFeature = new Feature({
        geometry: new LineString(route).transform('EPSG:4326', 'EPSG:3857')
      });

      routeFeature.setStyle(new Style({
        stroke: new Stroke({
          color: '#e11d48',
          width: 4,
        }),
        text: new Text({
          text: distanceText,
          font: 'bold 14px sans-serif',
          fill: new Fill({ color: '#111' }),
          stroke: new Stroke({ color: '#fff', width: 3 }),
          placement: 'line',
        }),
      }));

      routeLayer = new VectorLayer({
        source: new VectorSource({ features: [routeFeature] })
      });

      map.addLayer(routeLayer);
      map.getView().fit(routeFeature.getGeometry(), { padding: [60, 60, 60, 60], duration: 1000 });
    })
    .catch(() => alert('Không thể lấy dữ liệu đường đi!'));
});
// Ẩn bản đồ nếu chưa đăng nhập
if (!localStorage.getItem('role')) {
  window.location.href = 'login.html';
}

// Xử lý đăng xuất
document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem('role');
  window.location.href = 'login.html';
});
// quản lý nhà hàng
const parkSource = new VectorSource({
  format: new GeoJSON(),
  url: '/geoserver/QLNH/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=QLNH%3Acongvien&outputFormat=application%2Fjson'
});

const parkStyle = new Style({
  image: new Icon({
    src: 'anh.png',
    scale: 0.1,
    anchor: [0.5, 1]
  }),
  text: new Text({
    text: 'Nhà hàng',
    offsetY: -25,
    fill: new Fill({ color: '#006400' }),
    stroke: new Stroke({ color: '#fff', width: 2 }),
  })
});

const parkLayer = new VectorLayer({
  source: parkSource,
  style: parkStyle
});

map.addLayer(parkLayer);
//ẩn nút khi là user
if (localStorage.getItem('role') === 'user') {
  const userBtn = document.querySelector('a[href="users.html"]');
  const restBtn = document.querySelector('a[href="nhahang.html"]');
  if (userBtn) userBtn.style.display = 'none';
  if (restBtn) restBtn.style.display = 'none';
}


