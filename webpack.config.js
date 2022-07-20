import path from 'path';

export default {
    mode: 'production',
    entry: './src/browser.js',
    output: {
        path: path.resolve('./dist'),
        filename: 'browser.js',
    },
    resolve: {
        extensions: ['.js'],
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
        ],
    },
};

