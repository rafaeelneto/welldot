module.exports = function (grunt) {
  grunt.initConfig({
    dump_dir: {
      options: {
        // options
      },
      your_target: {
        // Target-specific file lists and/or options go here.
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['jshint']);
};
