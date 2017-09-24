
function MVVM(options) {
  this.$options = options || {};
  var data = this._data = this.$options.data;
  var self = this;

  /*
   数据代理，实现 vm.xxx 
   上面的代码看出 监听数据的对象是 options.data, 因此每次更新视图的时候；如：
   var vm = new MVVM({
     data: {name: 'kongzhi'}
   });
   那么更新数据就变成 vm._data.name = 'kongzhi2'; 但是我们想实现这样更改 vm.name = "kongzhi2";
   因此这边需要使用属性代理方式，利用Object.defineProperty()方法来劫持vm实列对象属性的读写权，使读写vm实列的属性转成vm.name的属性值。
   */
   Object.keys(data).forEach(function(key) {
     self._proxyData(key);
   });

   this._initComputed();

   // 初始化Observer
   observer(data, this);

   // 初始化 Compile
   this.$compile = new Compile(options.el || document.body, this);
}

MVVM.prototype = {
  $watch: function(key, cb, options) {
    new Watcher(this, key, cb);
  },

  _proxyData: function(key) {
    var self = this;
    Object.defineProperty(self, key, {
      configurable: false,  // 是否可以删除或修改目标属性
      enumerable: true,   // 是否可枚举
      get: function proxyGetter() {
        return self._data[key];
      },
      set: function proxySetter(newVal) {
        self._data[key] = newVal;
      }
    })
  },

  _initComputed: function() {
    var self = this;
    var computed = this.$options.computed;
    if (typeof computed === 'object') {
      Object.keys(computed).forEach(function(key) {
        Object.defineProperty(self, key, {
          get: typeof computed[key] === 'function' ? computed[key] : computed[key].get,
          set: function() {}
        })
      })
    }
  }
}