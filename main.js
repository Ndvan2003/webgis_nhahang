import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import { fromLonLat } from 'ol/proj';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Geolocation from 'ol/Geolocation';
import { Circle as CircleStyle, Fill, Stroke, Style, Icon, Text } from 'ol/style';
import { Circle as CircleGeom } from 'ol/geom';
import { defaults as defaultControls } from 'ol/control';
import { Overlay } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import LineString from 'ol/geom/LineString';
import XYZ from 'ol/source/XYZ';
import MousePosition from 'ol/control/MousePosition';
import { createStringXY } from 'ol/coordinate';


// khai báo biến 
let radiusLayer = null;
let routeLayer = null;
let userLocation = null;
let markerLayers = [];
// Khởi tạo bản đồ OSM
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([105.773841, 21.072439]),
    zoom: 15,
  }),
  controls: defaultControls({ zoom: false }),
});
// Thêm hiển thị toạ độ trên OSM
const mousePositionControl = new MousePosition({
  coordinateFormat: createStringXY(6),
  projection: 'EPSG:4326',
  className: '',
  target: document.getElementById('mouse-position'),
  undefinedHTML: '&nbsp;'
});
map.addControl(mousePositionControl);

//bản dồ vệ tinh
const satelliteLayer = new TileLayer({
  source: new XYZ({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles © Esri'
  }),
  visible: false
});
map.addLayer(satelliteLayer);
// Nút gạt switch vệ tinh
document.getElementById('toggleSatellite').addEventListener('change', function () {
  satelliteLayer.setVisible(this.checked);
});
// gán cho nút switch nhà hàng
document.getElementById('toggleRestaurant').addEventListener('change', function () {
  const isChecked = this.checked;
  vectorLayer.setVisible(isChecked);
  if (isChecked) {
    // Khi bật lớp nhà hàng => tắt label
    showLabel = false;
    document.getElementById('toggleLabel').checked = false;
    vectorLayer.setStyle(iconWithLabelStyle);
  }
});
// gán cho nút switch phường
document.getElementById('togglePhuong').addEventListener('change', function () {
  phuongBacTuLiemLayer.setVisible(this.checked);
});
// gán cho nút bật tắt lable
document.getElementById('toggleLabel').addEventListener('change', function () {
  showLabel = this.checked;
  vectorLayer.setStyle(iconWithLabelStyle); // cập nhật lại style
});
//WFS dữ liệu phường
const phuongBacTuLiemLayer = new VectorLayer({
  source: new VectorSource({
    url: '/geoserver/QLNH/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=QLNH:Diaphan_Bactuliem&outputFormat=application/json&maxFeatures=50',
    format: new GeoJSON()
  }),
  visible: false, 
  style: function (feature) {
    return new Style({
      stroke: new Stroke({
        color: 'rgb(168, 32, 32)',  
        width: 2
      }),
      fill: new Fill({
        color: 'rgba(0,0,0,0)' 
      }),
      text: new Text({
        text: feature.get('phuong') || '',  
        font: 'bold 12px Arial',
        fill: new Fill({ color: '#000' }),
        stroke: new Stroke({ color: '#fff', width: 2 })
      })
    });
  }
});

map.addLayer(phuongBacTuLiemLayer);
// WFS dữ liệu nhà hàng
const vectorSource = new VectorSource({
  format: new GeoJSON(),
  url: '/geoserver/QLNH/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=QLNH:nhahang&outputFormat=application/json'
});

let showLabel = true; // biến toàn cục

const iconWithLabelStyle = function (feature) {
  return new Style({
    image: new Icon({
      src: 'nhahang.png',
      crossOrigin: 'anonymous',
      scale: 0.08,
      anchor: [0.5, 1]
    }),
    text: showLabel ? new Text({
      text: feature.get('ten') || '',
      offsetY: -35,
      font: 'bold 13px Arial',
      fill: new Fill({ color: '#000' }),
      stroke: new Stroke({ color: '#fff', width: 3 }),
    }) : null
  });
};


const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: iconWithLabelStyle,
  visible: false
});
vectorLayer.setZIndex(10);
map.addLayer(vectorLayer);
// Vị trí người dùng và vẽ vòng tròn
document.getElementById('my-location-btn').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lon = position.coords.longitude;
        const lat = position.coords.latitude;
        userLocation = [lon, lat];

        const locationFeature = new Feature({
          geometry: new Point(fromLonLat([lon, lat])),
          name: 'Vị trí của tôi',
        });

        locationFeature.setStyle(
          new Style({
            image: new Icon({
              src: 'vitri.png',
              scale: 0.05,
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

        if (radiusLayer) map.removeLayer(radiusLayer);
        const circle = new CircleGeom(fromLonLat([lon, lat]), 1000);
        const circleFeature = new Feature(circle);

        radiusLayer = new VectorLayer({
          source: new VectorSource({ features: [circleFeature] }),
          style: new Style({
            stroke: new Stroke({ color: '#1d4ed8', width: 2 }),
            fill: new Fill({ color: 'rgba(30, 64, 175, 0.1)' }),
          }),
        });
        radiusLayer.setZIndex(1);
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

// Popup và xử lý click nhà hàng
const popupContainer = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupCloser = document.getElementById('popup-closer');
const popupOverlay = new Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: { duration: 250 }
});
map.addOverlay(popupOverlay);

const labels = {
  ten: 'Tên nhà hàng', dia_chi: 'Địa chỉ', mo_ta: 'Mô tả', khu_vuc: 'Khu vực',
  so_dien_th: 'Số điện thoại', mo_hinh: 'Mô hình', suc_chua_min: 'Sức chứa min',
  suc_chua_max: 'Sức chứa max', dien_tich_min: 'Diện tích min (m²)', dien_tich_max: 'Diện tích max (m²)',
  gia_min: 'Giá tối thiểu (nghìn)', gia_max: 'Giá tối đa (nghìn)', kinh_do: 'Kinh độ',
  vi_do: 'Vĩ độ', thoi_gian: 'Giờ hoạt động', danh_gia: 'Đánh giá', gui_xe: 'Gửi xe'
};
// click maker
map.on('singleclick', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feat) {
    return feat;
  });

  if (feature) {
    clickedFeature = feature; 
    const coordinates = feature.getGeometry().getCoordinates(); 
    const properties = feature.getProperties();
    delete properties.geometry;

    let html = '<table style="width:100%; border-collapse: collapse;">';
    const fieldsToShow = ['ten', 'dia_chi','khu_vuc','so_dien_th','mo_hinh', 'thoi_gian', 'danh_gia']; 
    fieldsToShow.forEach((key) => {
    //for (let key in properties) {
        const label = labels[key];
        let value = properties[key];
        if (key === 'danh_gia') value = parseFloat(value).toFixed(1);
        html += `<tr>
          <td style="font-weight: bold; padding: 4px; border-bottom: 1px solid #ccc;">${label}</td>
          <td style="padding: 4px; border-bottom: 1px solid #ccc;">${value}</td>
        </tr>`;
    });
    html += '</table>';
    html += `<div style="margin-top: 8px;">
      <button id="routeBtn" style="padding: 6px 12px; background-color: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">
        🔍 Chỉ đường
      </button>
    </div>`;
    popupContent.innerHTML = html;
    popupOverlay.setPosition(coordinates);
  } else {
    popupOverlay.setPosition(undefined);
  }
});
popupCloser.onclick = function () {
  popupOverlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};


// Tìm kiếm nhà hàng
let allFeatures = [];
vectorSource.on('featuresloadend', function () {
  allFeatures = vectorSource.getFeatures();
});

document.querySelector('.fa-search').addEventListener('click', () => {
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!keyword || keyword.length === 1) {
    alert('Vui lòng nhập ít nhất 2 ký tự để tìm kiếm!');
    return;
  }

  const matched = allFeatures.filter(feature =>
    (feature.get('ten') || '').toLowerCase().startsWith(keyword)
  );

  vectorSource.clear();
  vectorSource.addFeatures(matched);

  if (matched.length > 0) {
    const geometry = matched[0].getGeometry();
    map.getView().animate({ center: geometry.getCoordinates(), zoom: 17, duration: 1000 });
  } else {
    alert('Không tìm thấy nhà hàng!');
  }
});
// Thay đổi phần dịch lệnh chỉ đường
function translateType(type) {
  switch (type) {
    case 'turn': return 'Rẽ';
    case 'depart': return 'Bắt đầu đi';
    case 'arrive': return 'Đến nơi';
    case 'roundabout': return 'Vòng xuyến';
    case 'exit roundabout': return 'Ra khỏi vòng xuyến';
    case 'end of road': return 'Cuối đường';
    case 'merge': return 'Nhập làn';
    case 'new name': return 'Tiếp tục';
    case 'continue': return 'Tiếp tục';
    case 'notification': return 'Thông báo';
    case 'uturn': return 'Quay đầu';
    default: return type;
  }
}

function translateModifier(modifier) {
  switch (modifier) {
    case 'left': return 'trái';
    case 'right': return 'phải';
    case 'slight right': return 'chếch phải';
    case 'slight left': return 'chếch trái';
    case 'sharp right': return 'gấp phải';
    case 'sharp left': return 'gấp trái';
    case 'straight': return 'thẳng';
    case 'uturn': return 'quay đầu';
    default: return modifier;
  }
}
function getDirectionIcon(modifier) {
  switch (modifier) {
    case 'left': return '⬅️';
    case 'right': return '➡️';
    case 'straight': return '⬆️';
    case 'uturn': return '↩️';
    case 'sharp left': return '↙️';
    case 'sharp right': return '↘️';
    case 'slight left': return '↖️';
    case 'slight right': return '↗️';
    default: return '📍';
  }
}
// Chỉ đường
let clickedFeature = null;
document.addEventListener('click', function (e) {
  if (e.target && e.target.id === 'routeBtn') {
    if (!userLocation) {
      alert('Vui lòng nhấn "Vị trí của tôi" trước!');
      return;
    }

    if (!clickedFeature) {
      alert('Không tìm thấy nhà hàng!');
      return;
    }
        
    popupOverlay.setPosition(undefined); // Ẩn popup khi vẽ đường
    // Chỉ hiển thị nhà hàng được chọn
    vectorSource.clear();
    vectorSource.addFeature(clickedFeature);
    const lon1 = userLocation[0];
    const lat1 = userLocation[1];
    const lon2 = clickedFeature.get('kinh_do');
    const lat2 = clickedFeature.get('vi_do');

    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson&steps=true`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (!data.routes || data.routes.length === 0) return alert('Không thể vẽ đường đi!');
        const route = data.routes[0].geometry.coordinates;
        const dist = data.routes[0].distance;

        const routeFeature = new Feature({
          geometry: new LineString(route).transform('EPSG:4326', 'EPSG:3857')
        });

        routeFeature.setStyle(new Style({
          stroke: new Stroke({
            color: '#1d4ed8',
            width: 4,
          }),
        }));

        if (routeLayer) map.removeLayer(routeLayer);

        routeLayer = new VectorLayer({
          source: new VectorSource({ features: [routeFeature] })
        });

        map.addLayer(routeLayer);
        // Hiển thị bảng chỉ dẫn
          const steps = data.routes[0].legs[0].steps;
          const list = document.getElementById('direction-list');
          list.innerHTML = '';
          steps.forEach((step, i) => {
            const li = document.createElement('li');
            const type = step.maneuver.type || '';
            const modifier = step.maneuver.modifier || '';
            const road = step.name || 'đường chưa rõ';
            const distance = step.distance ? `${Math.round(step.distance)} m` : '0 m';
            const icon = getDirectionIcon(modifier);
            const isLastStep = i === steps.length - 1;
            // Dịch hành động
            let action = type === 'roundabout' || type === 'exit roundabout'
              ? `${translateType(type)}`
              : `${translateType(type)} ${translateModifier(modifier)}`;
            li.innerHTML = `
              <div style="font-weight: bold; font-size: 18px; color: ${isLastStep ? '#0f5132' : 'rgb(45, 46, 49)'};">
                ${i + 1}. ${isLastStep ? '🟢 Đã đến nơi' : `${action} vào ${road}`}
              </div>
              <div style="font-size: 18px; color: rgb(41, 30, 30); margin-left: 16px;">
                ${icon} Khoảng cách: ${isLastStep ? '0 km' : distance}
              </div>
            `;
            list.appendChild(li);
          });
          document.getElementById('direction-box').style.display = 'block';

        map.getView().fit(routeFeature.getGeometry(), {
          padding: [60, 60, 60, 60],
          duration: 1000
        });
      })
      .catch(() => alert('Không thể lấy dữ liệu đường đi!'));
  }
});
// nút thoát chỉ đường
window.hideDirectionBox = function () {
  // Ẩn bảng chỉ đường
  const box = document.getElementById('direction-box');
  box.style.display = 'none';

  // Xóa tuyến đường nếu có
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // Phóng lại vùng chứa tất cả nhà hàng
  if (vectorSource && allFeatures && allFeatures.length > 0) {
    vectorSource.clear();
    vectorSource.addFeatures(allFeatures);
    map.getView().fit(vectorSource.getExtent(), {
      padding: [60, 60, 60, 60],
      duration: 1000
    });
  }
}

// Khi  xoá hết inpt → khôi phục lại toàn bộ
document.getElementById('searchInput').addEventListener('input', (e) => {
  if (e.target.value.trim() === '') {
    vectorSource.clear();
    vectorSource.addFeatures(allFeatures);
  }
});
// hiển thị tất cả tên quán ở phần danh sách
const searchInput = document.getElementById('searchInput');
const suggestionBox = document.getElementById('suggest-box');
const suggestionList = document.getElementById('suggestions');

searchInput.addEventListener('input', function () {
  const input = this.value.trim().toLowerCase();
  suggestionList.innerHTML = '';

  if (input.length < 1) {
    suggestionBox.style.display = 'none';
    vectorSource.clear();
    vectorSource.addFeatures(allFeatures);
    return;
  }

  const matchedStores = allFeatures.filter((feature) =>
    (feature.get('ten') || '').toLowerCase().startsWith(input)
  );

  if (matchedStores.length > 0) {
    suggestionBox.style.display = 'block';
  } else {
    suggestionBox.style.display = 'none';
  }

  vectorSource.clear();
  vectorSource.addFeatures(matchedStores);

  matchedStores.slice(0, 10).forEach((feature) => {
    const ten = feature.get('ten');
    const li = document.createElement('li');
    li.innerHTML = `<i class="fa-solid fa-utensils"></i> ${ten}`;
    li.addEventListener('click', () => {
      searchInput.value = ten;
      suggestionBox.style.display = 'none';
      suggestionList.innerHTML = '';
      vectorSource.clear();
      vectorSource.addFeature(feature);

      const coords = feature.getGeometry().getCoordinates();
      map.getView().animate({ center: coords, zoom: 17, duration: 1000 });

      const popupContent = document.getElementById('popup-content');
      const popupOverlay = map.getOverlays().item(0);
      popupContent.innerHTML = `<strong>${ten}</strong>`;
      popupOverlay.setPosition(coords);
    });
    suggestionList.appendChild(li);
  });

  if (matchedStores.length > 0) {
    const coords = matchedStores[0].getGeometry().getCoordinates();
    map.getView().animate({ center: coords, zoom: 16, duration: 1000 });
  }
});

// nút lọc 
document.getElementById('apply-filter').addEventListener('click', () => {
  if (!allFeatures || allFeatures.length === 0) {
    alert('Dữ liệu chưa sẵn sàng!');
    return;
  }
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
    '5': [5.0, 5.0]  // ✅ Cho phép khoảng gần 5
  };
  const [minR, maxR] = ranges[rating];
  filtered = filtered.filter(f => {
    const r = parseFloat(f.get('danh_gia') || 0);
    return r >= minR && r <= maxR;
  });
}

// Lọc theo bán kính 
if (!isNaN(radius)) {
  if (!userLocation) {
    alert('Vui lòng bật "Vị trí của tôi" trước khi lọc theo bán kính!');
    return;
  }
  
  const [lon1, lat1] = userLocation;
  filtered = filtered.filter(f => {
    const lon2 = f.get('kinh_do') 
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
  filtered.forEach(f => {
    f.setStyle(iconWithLabelStyle(f)); 
});
//TỰ ĐỘNG HIỂN THỊ DANH SÁCH
  const listContainer = document.getElementById('list-container');
  const listResults = document.getElementById('list-results');
  listResults.innerHTML = '';

  if (filtered.length === 0) {
    listResults.innerHTML = 'Không có quán nào';
  } else {
    const [lon1, lat1] = userLocation;
// Gắn khoảng cách vào từng feature
  filtered.forEach(f => {
    const lon2 = f.get('kinh_do');
    const lat2 = f.get('vi_do');
    if (lon2 && lat2) {
      const d = calculateDistance(lat1, lon1, lat2, lon2);
      f.set('distance', d);
    } else {
      f.set('distance', Infinity);
    }
  });
// Sắp xếp từ gần đến xa
  filtered.sort((a, b) => a.get('distance') - b.get('distance'));
// Hiển thị danh sách
    filtered.forEach(f => {
      const ten = f.get('ten') || 'Không rõ tên';
      const d = f.get('distance');
      const distanceText = (d !== Infinity) ? ` (${Math.round(d * 1000)} m)` : '';

      const li = document.createElement('li');
      li.textContent = `🍽️ ${ten}${distanceText}`;
      li.style.padding = '4px 0';
      li.style.cursor = 'pointer';

      li.addEventListener('click', () => {
        const coords = f.getGeometry().getCoordinates();
        map.getView().animate({ center: coords, zoom: 17, duration: 800 });

        const listContainer = document.getElementById('list-container');
        if (listContainer) 
          listContainer.style.display = 'none';
      });
      listResults.appendChild(li);
      
    });
  }
  listContainer.style.display = 'block'; // ← hiện khung danh sách

  // Nếu có kết quả, zoom vào vị trí đầu tiên trong danh sách đã lọc
  if (filtered.length > 0) {
    const coord = filtered[0].getGeometry().getCoordinates();
    map.getView().animate({ center: coord, zoom: 15, duration: 1000 });
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
  const R = 6371; // bán kính Trái đất tính theo km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // kết quả trả về là km
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

      const routeFeature = new Feature({
        geometry: new LineString(route).transform('EPSG:4326', 'EPSG:3857')
      });
      routeFeature.setStyle(new Style({
        stroke: new Stroke({
          color: '#1d4ed8',
          width: 4,
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
// Click vào bản đồ để tạo mới nhà hàng
map.on('dblclick', function (evt) {
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feat) {
    return feat;
  });

  // Nếu không nhấn vào marker nhà hàng
  if (!feature) {
    const lonLat = ol.proj.toLonLat(evt.coordinate);
    const lon = lonLat[0].toFixed(6);
    const lat = lonLat[1].toFixed(6);

    // Lưu vào localStorage
    localStorage.setItem('pending_lon', lon);
    localStorage.setItem('pending_lat', lat);

    // Chuyển sang trang thêm nhà hàng
    window.location.href = 'nhahang.html#add';
  }
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
//ẩn nút khi là user
if (localStorage.getItem('role') === 'user') {
  const userBtn = document.querySelector('a[href="users.html"]');
  const restBtn = document.querySelector('a[href="nhahang.html"]');
  if (userBtn) userBtn.style.display = 'none';
  if (restBtn) restBtn.style.display = 'none';
}





