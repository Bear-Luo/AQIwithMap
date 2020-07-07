const cardComponent = {
  template: `
  <div class="box">
    <div class="box-item" :class="statusClass">
      <div>
        {{ cardItem.County }} - {{ cardItem.SiteName }}
        <a href="#" @click.prevent="cardFun"><slot name="i"><i class="far fa-star"></i></slot></a>
      </div>
      <div>
        <ul class="list-unstyled">
          <li>AQI 指數: {{ cardItem.AQI }}</li>
          <li>PM2.5: {{ cardItem['PM2.5' ]}}</li>
          <li>說明: {{ cardItem.Status }}</li>
        </ul>
      </div>
    </div>
  </div>
  `,
  props: ["cardItem"],
  data() {
    return {
      statusClass: {
        "status-aqi2": false,
        "status-aqi3": false,
        "status-aqi4": false,
        "status-aqi5": false,
        "status-aqi6": false
      }
    };
  },
  created() {
    // 城市空汙顏色
    this.cardColor();
  },
  methods: {
    cardFun() {
      this.$emit("itemname"); // 不可用大寫!!!
    },
    cardColor() {
      switch (this.cardItem.Status) {
        case "普通":
          this.statusClass["status-aqi2"] = true;
          break;
        case "對敏感族群不健康":
          this.statusClass["status-aqi3"] = true;
          break;
        case "對所有族群不健康":
          this.statusClass["status-aqi4"] = true;
          break;
        case "非常不健康":
          this.statusClass["status-aqi5"] = true;
          break;
        case "危害":
          this.statusClass["status-aqi6"] = true;
          break;
      }
    }
  }
};

var app = new Vue({
  el: "#app",
  data: {
    data: [],
    location: [],
    stared: [],
    filter: "all",
    countyName: "",
    isLoading: false,
    isError: {
      status: false,
      msg: '暫時無法更新'
    }
  },
  components: {
    card: cardComponent
  },
  created() {
    this.getData();
  },
  methods: {
    async getTaiwanMap() {
      const width = (this.$refs.map.offsetWidth).toFixed(),
        height = (this.$refs.map.offsetHeight).toFixed();

      // 判斷螢幕寬度，給放大值
      let mercatorScale, w = window.screen.width;
      if (w > 1023) {
        mercatorScale = 9000;
      } else return

      // d3：svg path 產生器
      var path = await d3.geo.path().projection(
        // !important 座標變換函式
        d3.geo
          .mercator()
          .center([121, 24])
          .scale(mercatorScale)
          .translate([width / 1.5, height / 1.9])
      );

      // 讓 d3 抓 svg ，並寫入寬高
      var svg = await d3.select('#svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

      // 讓 d3 抓 GeoJSON 檔，並寫入path的路徑
      var url = 'json/taiwan.geojson';
      await d3.json(url, (error, geometry) => {
        if (error) throw error;

        svg
          .selectAll('path')
          .data(geometry.features)
          .enter().append('path')
          .attr('d', path)
          .attr({
            // 設定 id，為了 click 時加 class 用
            id: (d) => 'city' + d.properties.COUNTYCODE,
            // 設定 name，為了 select change 時加 class 用
            name: (d) => d.properties.COUNTYNAME
          })
          .on('click', d => {
            // 有 .active 存在，就移除 .active
            if (document.querySelector('.active')) {
              document.querySelector('.active').classList.remove('active');
            }
            // 被點擊的縣市加上 .active
            document.getElementById('city' + d.properties.COUNTYCODE).classList.add('active');
            console.log(document.getElementById('city' + d.properties.COUNTYCODE))
            // 連動 select
            const vm = this
            vm.filter = d.properties.COUNTYNAME;
          });
      });
      return svg;
    },
    getData() {
      const vm = this;
      vm.isLoading = true;
      const url =
        "https://cors-anywhere.herokuapp.com/http://opendata2.epa.gov.tw/AQI.json";

      // API 來源
      // https://opendata.epa.gov.tw/Data/Contents/AQI/

      fetch(url)
        .then(function (response) {
          if (response.ok) {
            return response.json();
          }
          throw new Error(true)
        })
        .then(function (myJson) {
          vm.data = myJson;

          // 篩出地區
          const getCounty = vm.data.map((item) => item.County);
          // 過濾重複地區
          vm.location = getCounty.filter(function (element, index, arr) {
            return arr.indexOf(element) === index;
          });
          vm.isLoading = false;
        })
        .catch(function (error) {
          vm.isError.status = error;
          vm.isLoading = false;
        });
      // 判斷是否有收藏城市的紀錄
      vm.stared = JSON.parse(localStorage.getItem("starStr")) || [];
    },
    updateStared() {
      localStorage.setItem("starStr", JSON.stringify(this.stared));
      this.stared = JSON.parse(localStorage.getItem("starStr"));
    },
    addStar(para) {
      this.stared.push(para);
      this.updateStared();
    },
    removeStar(para) {
      this.stared.splice(this.stared.indexOf(para), 1);
      this.updateStared();
    },
    areaAddActive() {
      if (this.filter === 'all') {
        if (document.querySelector('.active')) {
          document.querySelector('.active').classList.remove('active');
        }
      } else {
        if (document.querySelector('.active')) {
          document.querySelector('.active').classList.remove('active');
        }
        // select change 後地圖的對應縣市加上 .actve
        const areaId = document.getElementsByName(this.filter)[0].id;
        document.getElementById(areaId).classList.add('active');
      }
    }
  },
  computed: {
    computedData() {
      const vm = this;
      if (this.filter === 'all') {
        return vm.data.filter(item => vm.stared.indexOf(item.SiteId) == -1);
      } else {
        const arry = vm.data.filter(item => vm.stared.indexOf(item.SiteId) == -1);
        return arry.filter(item => arry.indexOf(item.County) == -1);
      }
    },
    newStared() {
      const vm = this;
      return vm.data.filter(item => vm.stared.indexOf(item.SiteId) >= 0);
    }
  },
  mounted() {
    this.getTaiwanMap();
  },
});
