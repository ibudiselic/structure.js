module.exports = function(grunt) {

  grunt.initConfig({
    concat: {
      dist: {
        src: ['src/header.js',
              'src/exports.js',
              'src/init.js',
              'src/structure-decl.js',
              'src/hashtable.js',
              'src/footer.js'],
        dest: 'lib/structure.js'
      },

      inline: {
        src: ['src/structure-decl.js',
              'src/hashtable.js'],
        dest: 'lib/inline-hashtable.js'
      }
    },

    lint: {
      all: ['src/exports.js', 'src/hashtable.js', 'test/*.js']
    },

    min: {
      dist: {
        src: ['lib/structure.js'],
        dest: 'lib/structure.min.js'
      }
    },

    jasmine_node: {
      specFolderName: "",
      projectRoot: "./test",
      requirejs: false,
      forceExit: true,
      matchall: true,
      verbose: false
    }
  });

  grunt.loadNpmTasks('grunt-jasmine-node');

  grunt.registerTask('default', 'lint concat jasmine_node min');

};
