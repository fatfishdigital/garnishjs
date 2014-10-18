<?php

/**
 *
 */
class Builder
{
	protected $_sourceDir;
	protected $_buildScriptDir;
	protected $_buildDir;
	protected $_uncompressedFileName;
	protected $_compressedFileName;
	protected $_uncompressedFile;
	protected $_compressedFile;
	protected $_repoPath;
	protected $_startTime;
	protected $_isWindows;

	private $_version = '0.1';

	/**
	 * @param $args
	 * @throws Exception
	 */
	public function __construct($args)
	{
		$this->_startTime = BuildUtils::getBenchmarkTime();
		$this->_isWindows = BuildUtils::isWindows();
		date_default_timezone_set('UTC');

		$this->_repoPath = getenv('GITREPO_PATH');

		if (!$this->_repoPath)
		{
			throw new Exception('Could not find the GITREPO_PATH environment variable.');
		}

		$this->_repoPath = rtrim(str_replace('\\', '/', $this->_repoPath), '/').'/';
	}

	/**
	 *
	 */
	public function init()
	{
		$projectRoot = realpath(dirname(__FILE__)).'/../../';

		$this->_sourceDir      = str_replace('\\', '/', realpath($projectRoot.'Source').'/');
		$this->_buildScriptDir = str_replace('\\', '/', realpath($projectRoot.'BuildScripts').'/');
		$this->_buildDir       = str_replace('\\', '/', realpath($projectRoot.'Build').'/');

		$this->_uncompressedFileName = 'garnish-'.$this->_version.'.js';
		$this->_compressedFileName = 'garnish-'.$this->_version.'.min.js';
		$this->_sourceMapFileName = 'garnish-'.$this->_version.'.min.map';

		$this->_uncompressedFile = $this->_buildDir.$this->_uncompressedFileName;
		$this->_compressedFile = $this->_buildDir.$this->_compressedFileName;
		$this->_sourceMapFile = $this->_buildDir.$this->_sourceMapFileName;
	}

	/**
	 *
	 */
	public function run()
	{
		$this->prepBuildDir();

		$this->compressJs();
		$this->copyGarnishFiles();

		$totalTime = BuildUtils::getBenchmarkTime() - $this->_startTime;
		echo PHP_EOL.'Execution Time: '.$totalTime.' seconds.'.PHP_EOL;
	}

	/**
	 *
	 */
	protected function prepBuildDir()
	{
		if (!file_exists($this->_buildDir))
		{
			BuildUtils::createDir($this->_buildDir, 0755);
		}
		else
		{
			BuildUtils::changePermissions($this->_buildDir, 755);
		}
	}

	/**
	 *
	 */
	protected function compressJs()
	{
		echo "Merging all of the JS files into {$this->_uncompressedFile}...".PHP_EOL;

		// Assemble a list of all the JS files
		$jsFiles = array(
			$this->_sourceDir.'Base.js',
			$this->_sourceDir.'garnish.js',
		);
		$jsClassFiles = glob($this->_sourceDir.'classes/*.js');
		$jsFiles = array_merge($jsFiles, $jsClassFiles);

		// Assempble the build file contents
		$contents = <<<HEADER
/**
 * Garnish UI toolkit
 *
 * @copyright 2013 Pixel & Tonic, Inc.. All rights reserved.
 * @author    Brandon Kelly <brandon@pixelandtonic.com>
 * @version   {$this->_version}
 * @license   THIS IS NO F.O.S.S!
 */
(function($){


HEADER;

		// Add each of the JS file contents
		foreach ($jsFiles as $jsFile)
		{
			$contents .= file_get_contents($jsFile)."\n\n";
		}

		// Add the footer
		$contents .= "})(jQuery);\n";

		// Save out the uncompressed file
		file_put_contents($this->_uncompressedFile, $contents);

		echo "Finished merging all of the JS files into {$this->_uncompressedFile}".PHP_EOL.PHP_EOL;

		// Compress it
		echo "Compressing {$this->_uncompressedFile} into {$this->_compressedFile}...".PHP_EOL;

		//$yuiCompressorFile = $this->_buildScriptDir . 'lib/yuicompressor-2.4.7/build/yuicompressor-2.4.7.jar';
		//$command = "java -jar {$yuiCompressorFile} --charset utf-8 --type js {$this->_uncompressedFile} > {$this->_compressedFile}";

		$command = "java -jar {$this->_buildScriptDir}lib/compiler/compiler.jar" .
		           " --language_in ECMASCRIPT5" .
		           " --js {$this->_uncompressedFile}" .
		           " --create_source_map {$this->_sourceMapFile}" .
		           " --source_map_format=V3" .
		           " --js_output_file {$this->_compressedFile}";

		echo "Executing: {$command}".PHP_EOL;
		exec("{$command} 2>&1", $output, $status);
		echo "Status: {$status}".PHP_EOL;
		$output = implode(PHP_EOL, $output);
		echo "Results: {$output}".PHP_EOL;

		if ($status !== 0)
		{
			throw new Exception('Could not compressJs a file: '.$jsFile);
		}

		echo "Finished compressing {$this->_uncompressedFile} into {$this->_compressedFile}".PHP_EOL.PHP_EOL;

		// Add the source map path to the compressed file
		$contents = file_get_contents($this->_compressedFile);
		$contents .= "\n//# sourceMappingURL=".pathinfo($this->_sourceMapFile, PATHINFO_BASENAME)."\n";
		file_put_contents($this->_compressedFile, $contents);

		// Clean up the source map
		$contents = file_get_contents($this->_sourceMapFile);
		$contents = str_replace($this->_buildDir, '', $contents);
		file_put_contents($this->_sourceMapFile, $contents);
	}

	/**
	 *
	 */
	protected function copyGarnishFiles()
	{
		echo ('Copying Garnish files into other repos...'.PHP_EOL.PHP_EOL);

		$copyPaths = array(
			'assets/Source/themes/third_party/assets/lib/'       => array($this->_compressedFileName, $this->_uncompressedFileName, $this->_sourceMapFileName),
			'assets/Build/Assets/themes/third_party/assets/lib/' => array($this->_compressedFileName, $this->_uncompressedFileName, $this->_sourceMapFileName),
			'Craft/Source/craft/app/resources/lib/'              => array($this->_compressedFileName, $this->_uncompressedFileName, $this->_sourceMapFileName),
		);

		foreach ($copyPaths as $targetPath => $sourceFileNames)
		{
			foreach ($sourceFileNames as $sourceFileName)
			{
				$sourceFile = $this->_buildDir.$sourceFileName;
				$targetFile = $this->_repoPath.$targetPath.$sourceFileName;

				echo ('Copying file from '.$sourceFile.' to '.$targetFile.PHP_EOL);
				copy($sourceFile, $targetFile);
				echo ('Finished copying file from '.$sourceFile.' to '.$targetFile.PHP_EOL);
			}
		}

		echo (PHP_EOL.'Finished copying Garnish files into other repos.'.PHP_EOL.PHP_EOL);
	}

	/**
	 * @param $newContents
	 * @param $oldContents
	 * @param $file
	 */
	private function _saveContents($newContents, $oldContents, $file)
	{
		if ($newContents != $oldContents)
		{
			echo ('Saving... ');
			file_put_contents($file, $newContents);
			echo ('Done.');
		}
		else
		{
			echo ('No changes.');
		}
	}

	/**
	 * @param $path
	 * @return bool
	 */
	private function _excludePathSegments($path)
	{
		$pass = true;
		//$path = str_replace('\\', '/', $path);

		//if (strpos($path, '/framework/') !== false)
		//{
		//	$pass = false;
		//}

		return $pass;
	}
}
